import { useState, useEffect } from "react";
import Order from "@/pages/types/order.type";
import { emitNfeForOrder, NfeEmissionResult, printOrderDanfe } from "@/pages/utils/nfe/nfeService";
import { NfeItemWithFiscal, NfeItemFiscal } from "./NfeItemsSection";
import { getSettings } from "@/pages/utils/settingsService";
import { getFullProduct } from "@/pages/utils/productService";
import { toast } from "react-toastify";

export function useNfeEmission(order: Order | null, onSuccess?: () => void) {
    const [environment, setEnvironment] = useState<1 | 2>(2); // 2 = Homologação (Testes)
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [emissionResult, setEmissionResult] = useState<NfeEmissionResult | null>(null);
    const [nfeItems, setNfeItems] = useState<NfeItemWithFiscal[]>([]);
    const [isLoadingFiscalData, setIsLoadingFiscalData] = useState(false);

    // Carregar e enriquecer os itens da venda com dados fiscais e detecção de cadastro
    useEffect(() => {
        if (!order || !order.items) {
            setNfeItems([]);
            return;
        }

        const settings = getSettings();
        const defaultFiscal = (settings as any).fiscalDefaults || {};

        let isMounted = true;
        setIsLoadingFiscalData(true);

        const enrichItems = async () => {
            const enrichedList: NfeItemWithFiscal[] = [];

            for (const item of order.items) {
                const isUnregistered = !item.productId;
                let itemNcm = (item as any).fiscal?.ncm || '';
                let itemCest = (item as any).fiscal?.cest || '';
                let itemCfop = (item as any).fiscal?.cfop || defaultFiscal.cfop || '5102';
                let itemCst = (item as any).fiscal?.cst || defaultFiscal.cst || '102';
                let itemOrigem = (item as any).fiscal?.origem || defaultFiscal.origem || '0';

                // Se o produto está cadastrado no ERP mas não veio com dados fiscais no snapshot do item,
                // consulta o cadastro do produto/variação no banco para obter NCM/dados fiscais oficiais
                if (item.productId && (!itemNcm || itemNcm === '94036000')) {
                    try {
                        const fullProd = await getFullProduct(item.productId);
                        if (fullProd?.fiscal?.ncm) {
                            itemNcm = fullProd.fiscal.ncm;
                        }
                        if (fullProd?.fiscal?.cest) {
                            itemCest = fullProd.fiscal.cest;
                        }
                        if (fullProd?.fiscal?.cfop) {
                            itemCfop = fullProd.fiscal.cfop;
                        }
                    } catch (e) {
                        // ignore
                    }
                }

                enrichedList.push({
                    ...item,
                    isUnregistered,
                    fiscal: {
                        ncm: itemNcm,
                        cest: itemCest,
                        cfop: itemCfop,
                        cst: itemCst,
                        origem: itemOrigem
                    }
                });
            }

            if (isMounted) {
                setNfeItems(enrichedList);
                setIsLoadingFiscalData(false);
            }
        };

        enrichItems();

        return () => {
            isMounted = false;
        };
    }, [order]);

    const handleUpdateItemFiscal = (index: number, updates: Partial<NfeItemFiscal>) => {
        setNfeItems(prev => prev.map((item, idx) => {
            if (idx !== index) return item;
            return {
                ...item,
                fiscal: {
                    ...item.fiscal,
                    ...updates
                }
            };
        }));
    };

    const handleBatchUpdateItems = (updated: NfeItemWithFiscal[]) => {
        setNfeItems(updated);
    };

    const handleEmit = async () => {
        if (!order) return;
        setIsSubmitting(true);
        try {
            // Constrói pedido com os itens atualizados e dados fiscais específicos
            const orderWithFiscalItems: Order = {
                ...order,
                items: nfeItems.map(item => ({
                    ...item,
                    fiscal: item.fiscal
                } as any))
            };

            const res = await emitNfeForOrder(orderWithFiscalItems, environment);
            if (!res.success) {
                toast.error(res.error || "Erro ao validar dados para emissão.");
                setEmissionResult(res);
                return;
            }

            setEmissionResult(res);
            toast.success("Nota fiscal de homologação emitida e autorizada com sucesso! 🎉");
            if (onSuccess) onSuccess();
        } catch (err: any) {
            console.error(err);
            toast.error(err?.message || "Erro inesperado ao emitir nota fiscal.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handlePrintDanfe = () => {
        if (!order) return;
        if (emissionResult?.danfeData) {
            import("@/pages/utils/nfe/danfeGenerator").then(m => {
                m.openDanfePrintWindow(emissionResult.danfeData!);
            });
        } else if ((order as any).nfeData) {
            printOrderDanfe(order);
        }
    };

    return {
        environment,
        setEnvironment,
        isSubmitting,
        emissionResult,
        nfeItems,
        isLoadingFiscalData,
        handleUpdateItemFiscal,
        handleBatchUpdateItems,
        handleEmit,
        handlePrintDanfe
    };
}
