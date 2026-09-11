import { useCallback, useEffect, useRef, useState } from 'react';
import { InboundInvoiceItem } from '@/pages/utils/inboundNfe/inboundNfeTypes';
import { findProductSupplierCodes } from '@/pages/utils/productSupplierCodesService';
import { fetchSupplierProductsForContext, SupplierProductSummary } from '@/pages/utils/inboundNfe/inboundSupplierProductContext';
import { calculateProductMatchScore, extractMeaningfulTokens } from '@/pages/utils/inboundNfe/inboundMatchingRules';
import { RealProductSuggestion } from '../InboundInvoiceItemCard';
import { toast } from 'react-toastify';

interface UseInboundInvoiceSuggestionsParams {
    items: InboundInvoiceItem[];
    supplierId?: string;
}

export function useInboundInvoiceSuggestions({ items, supplierId }: UseInboundInvoiceSuggestionsParams) {
    const [realSuggestions, setRealSuggestions] = useState<Record<number, RealProductSuggestion>>({});
    const [rejectedSuggestions, setRejectedSuggestions] = useState<Record<number, boolean>>({});
    const [isProcessingSuggestions, setIsProcessingSuggestions] = useState(false);
    const supplierProductsCacheRef = useRef<{ supplierId: string; products: SupplierProductSummary[] } | null>(null);

    // Invalida cache quando o fornecedor muda
    useEffect(() => {
        if (supplierId && supplierProductsCacheRef.current?.supplierId !== supplierId) {
            supplierProductsCacheRef.current = null;
        }
    }, [supplierId]);

    /** Obtém os produtos do fornecedor, usando cache quando disponível. */
    const getSupplierProducts = useCallback(async (): Promise<SupplierProductSummary[]> => {
        if (!supplierId) return [];
        if (supplierProductsCacheRef.current?.supplierId === supplierId) {
            return supplierProductsCacheRef.current.products;
        }
        const products = await fetchSupplierProductsForContext(supplierId);
        supplierProductsCacheRef.current = { supplierId, products };
        return products;
    }, [supplierId]);

    // Função central para buscar correspondências reais cadastradas no ERP
    const executeFindSuggestions = useCallback(async (ignoredRejections: Record<number, boolean> = rejectedSuggestions, showFeedback = false) => {
        if (!supplierId || !items.length) {
            setRealSuggestions({});
            return;
        }

        const unlinked = items.filter((it) => !it.matchedProductId);
        if (!unlinked.length) {
            setRealSuggestions({});
            if (showFeedback) {
                toast.info('Todos os itens desta NF já estão vinculados.');
            }
            return;
        }

        setIsProcessingSuggestions(true);
        try {
            if (showFeedback) {
                await new Promise((resolve) => setTimeout(resolve, 400));
            }

            // 1. Códigos do fornecedor já mapeados
            const codes = unlinked.map((it) => it.productCode).filter(Boolean);
            const mappings = codes.length ? await findProductSupplierCodes(supplierId, codes) : new Map();

            // 2. Produtos reais cadastrados deste fornecedor no ERP
            const supplierProducts = await getSupplierProducts();

            const matched: Record<number, RealProductSuggestion> = {};
            let newlyFoundCount = 0;

            for (const item of unlinked) {
                if (ignoredRejections[item.itemNumber]) continue;

                // A) Código já mapeado
                if (item.productCode) {
                    const directMatch = mappings.get(item.productCode.trim().toLocaleUpperCase('pt-BR'));
                    if (directMatch) {
                        const foundProd = supplierProducts.find((p) => p.id === directMatch.productId);
                        const foundVar = foundProd?.variations.find((v) => v.id === directMatch.productVariationId);
                        const displayName = foundVar?.name?.trim() || foundProd?.name || 'Produto já vinculado';
                        matched[item.itemNumber] = {
                            productId: directMatch.productId,
                            variationId: directMatch.productVariationId,
                            displayName,
                            product: foundProd || { id: directMatch.productId, name: displayName },
                            variation: foundVar,
                        };
                        newlyFoundCount++;
                        continue;
                    }
                }

                // B) Similaridade estrita com produtos reais já cadastrados no ERP
                if (supplierProducts.length > 0) {
                    const nfTokens = extractMeaningfulTokens(item.productDescription);
                    if (!nfTokens.length) continue;

                    let bestMatch: { product: SupplierProductSummary; variation?: any; score: number; name: string } | null = null;

                    for (const prod of supplierProducts) {
                        const score = calculateProductMatchScore(prod.name, item.productDescription);

                        if (score > 0 && (!bestMatch || score > bestMatch.score)) {
                            let matchedVar: any;
                            if (prod.variations?.length) {
                                matchedVar = prod.variations.find((v) => {
                                    const varTokens = extractMeaningfulTokens(v.name);
                                    return varTokens.some((vt) => nfTokens.includes(vt));
                                });
                            }

                            const displayName = matchedVar?.name?.trim() || prod.name;
                            bestMatch = { product: prod, variation: matchedVar, score, name: displayName };
                        }
                    }

                    if (bestMatch) {
                        matched[item.itemNumber] = {
                            productId: bestMatch.product.id,
                            variationId: bestMatch.variation?.id,
                            displayName: bestMatch.name,
                            product: bestMatch.product,
                            variation: bestMatch.variation,
                        };
                        newlyFoundCount++;
                    }
                }
            }

            setRealSuggestions(matched);

            if (showFeedback) {
                if (newlyFoundCount > 0) {
                    toast.success(`${newlyFoundCount} ${newlyFoundCount === 1 ? 'sugestão encontrada' : 'sugestões encontradas'} para os itens.`);
                } else {
                    toast.info('Nenhum produto correspondente foi encontrado no catálogo deste fornecedor.');
                }
            }
        } catch (err) {
            console.warn('[useInboundInvoiceSuggestions] Erro ao buscar correspondências reais:', err);
            if (showFeedback) {
                toast.error('Erro ao processar sugestões de vínculos.');
            }
        } finally {
            setIsProcessingSuggestions(false);
        }
    }, [items, supplierId, rejectedSuggestions, getSupplierProducts]);

    // Busca automática inicial de sugestões
    useEffect(() => {
        void executeFindSuggestions(rejectedSuggestions, false);
    }, [items, supplierId, rejectedSuggestions, executeFindSuggestions]);

    // Disparador manual para o botão "Sugerir novamente para os restantes"
    const handleTriggerSuggestions = async () => {
        const newRejections = { ...rejectedSuggestions };
        items.forEach((item) => {
            if (!item.matchedProductId) {
                delete newRejections[item.itemNumber];
            }
        });
        setRejectedSuggestions(newRejections);
        await executeFindSuggestions(newRejections, true);
    };

    const rejectSuggestion = (itemNumber: number) => {
        setRejectedSuggestions((prev) => ({ ...prev, [itemNumber]: true }));
    };

    return {
        realSuggestions,
        rejectedSuggestions,
        isProcessingSuggestions,
        executeFindSuggestions,
        handleTriggerSuggestions,
        rejectSuggestion,
        getSupplierProducts,
    };
}
