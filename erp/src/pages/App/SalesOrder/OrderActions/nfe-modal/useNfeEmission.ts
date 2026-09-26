import { useState, useEffect, useRef } from "react";
import Order from "@/pages/types/order.type";
import { emitNfeForOrder, NfeEmissionResult, printOrderDanfe } from "@/pages/utils/nfe/nfeService";
import { NfeItemWithFiscal, NfeItemFiscal } from "./NfeItemsSection";
import { getSettings } from "@/pages/utils/settingsService";
import { getFullProduct } from "@/pages/utils/productService";
import { toast } from "react-toastify";
import { aiService } from '@/pages/utils/aiService';
import type { NcmAiSuggestion } from '@/pages/utils/aiService/aiFiscalClassificationService';
import { isQuotaExceeded, notifyAiQuotaWarning } from '@/services/aiGateway/aiQuotaNotifier';
import { acceptPendingNcmSuggestion, rejectPendingNcmSuggestion, setPendingNcmSuggestion } from '@/pages/utils/nfe/ncmSuggestionReview';
import { DEFAULT_NFE_ENVIRONMENT } from '@/pages/utils/nfe/nfeEnvironment';

export function useNfeEmission(order: Order | null, onSuccess?: () => void) {
    const [environment, setEnvironment] = useState<1 | 2>(DEFAULT_NFE_ENVIRONMENT);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [emissionResult, setEmissionResult] = useState<NfeEmissionResult | null>(null);
    const [nfeItems, setNfeItems] = useState<NfeItemWithFiscal[]>([]);
    const [isLoadingFiscalData, setIsLoadingFiscalData] = useState(false);
    const [suggestingNcmIndex, setSuggestingNcmIndex] = useState<number | null>(null);
    const suggestionRequestVersion = useRef(0);

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

            const productItems = order.items.filter(item => item.itemType !== 'service');
            for (const item of productItems) {
                const isUnregistered = !item.productId;
                let itemNcm = (item as any).fiscal?.ncm || '';
                let itemCest = (item as any).fiscal?.cest || '';
                let itemCfop = (item as any).fiscal?.cfop || defaultFiscal.cfop || '5102';
                const itemCst = (item as any).fiscal?.cst || defaultFiscal.cst || '102';
                const itemOrigem = (item as any).fiscal?.origem || defaultFiscal.origem || '0';

                // Se o produto está cadastrado no ERP mas não veio com dados fiscais no snapshot do item,
                // consulta o cadastro do produto/variação no banco para obter NCM/dados fiscais oficiais
                if (item.productId) {
                    try {
                        const fullProd = await getFullProduct(item.productId);
                        const variation = item.variationId
                            ? fullProd?.variations?.find(candidate => candidate.id === item.variationId)
                            : undefined;
                        const catalogFiscal = variation?.fiscal || fullProd?.fiscal;
                        if (!itemNcm && catalogFiscal?.ncm) {
                            itemNcm = catalogFiscal.ncm;
                        }
                        if (!itemCest && catalogFiscal?.cest) {
                            itemCest = catalogFiscal.cest;
                        }
                        if (!itemCfop && catalogFiscal?.cfop) {
                            itemCfop = catalogFiscal.cfop;
                        }
                    } catch {
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

    const handleSuggestNcm = async (index: number) => {
        const item = nfeItems[index];
        if (!item || suggestingNcmIndex !== null) return;
        const requestVersion = ++suggestionRequestVersion.current;
        setSuggestingNcmIndex(index);
        try {
            const product = item.productId ? await getFullProduct(item.productId) : null;
            if (requestVersion !== suggestionRequestVersion.current) return;
            const variation = item.variationId
                ? product?.variations?.find(candidate => candidate.id === item.variationId)
                : undefined;
            const suggestion: NcmAiSuggestion = await aiService.findNCM(
                item.description || product?.description || '',
                variation?.fiscal?.material || product?.fiscal?.material || product?.material || '',
                product?.description || '',
                product?.category || ''
            );
            if (requestVersion !== suggestionRequestVersion.current) return;
            if (suggestion.ncm) {
                setNfeItems(current => current.map((currentItem, currentIndex) => currentIndex === index
                    ? setPendingNcmSuggestion(currentItem, suggestion)
                    : currentItem));
            } else {
                toast.info(suggestion.reviewReason || 'Não foi possível sugerir um NCM. Você pode informar o código manualmente.');
            }
        } catch (error) {
            console.error('[NFe] Falha ao buscar sugestão de NCM para o item.', error);
            if (isQuotaExceeded(error)) notifyAiQuotaWarning('NCM', 'classificação fiscal');
            else toast.warning('Não foi possível obter a sugestão de NCM. Informe o código manualmente ou tente novamente.');
        } finally {
            setSuggestingNcmIndex(null);
        }
    };

    const handleAcceptNcmSuggestion = (index: number) => {
        setNfeItems(current => current.map((item, itemIndex) => {
            return itemIndex === index ? acceptPendingNcmSuggestion(item) : item;
        }));
    };

    const handleRejectNcmSuggestion = (index: number) => {
        setNfeItems(current => current.map((item, itemIndex) => itemIndex === index
            ? rejectPendingNcmSuggestion(item)
            : item));
    };

    const handleEmit = async (productionConfirmed = false) => {
        if (!order) return;
        setIsSubmitting(true);
        try {
            // Constrói pedido com os itens atualizados e dados fiscais específicos
            const orderWithFiscalItems: Order = {
                ...order,
                items: [
                    ...nfeItems.map(item => ({
                    ...item,
                    fiscal: item.fiscal
                } as any)),
                    ...(order.items || []).filter(item => item.itemType === 'service'),
                ]
            };

            const res = await emitNfeForOrder(orderWithFiscalItems, environment, productionConfirmed);
            if (!res.success) {
                toast.error(res.error || "Erro ao validar dados para emissão.");
                setEmissionResult(res);
                return;
            }

            setEmissionResult(res);
            toast.success(res.environment === 2
                ? 'Documento autorizado pela SEFAZ em homologação (sem valor fiscal).'
                : 'Documento autorizado pela SEFAZ em produção.');
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
        suggestingNcmIndex,
        handleUpdateItemFiscal,
        handleBatchUpdateItems,
        handleSuggestNcm,
        handleAcceptNcmSuggestion,
        handleRejectNcmSuggestion,
        handleEmit,
        handlePrintDanfe
    };
}
