import { useState, useRef, useEffect, useMemo } from 'react';
import type Product from '@/pages/types/product.type';
import type { Variation } from '@/pages/types/product.type';
import type Person from '@/pages/types/person.type';
import type { InboundInvoiceItem } from '@/pages/utils/inboundNfe/inboundNfeTypes';
import { findProductSupplierCodes, saveProductSupplierCode, deleteProductSupplierCode } from '@/pages/utils/productSupplierCodesService';
import { getFullProduct, saveVariation } from '@/pages/utils/productService';
import { fetchGroupsAndCategories } from '@/pages/utils/categoryService';
import { resolveAutoCategory } from '@/pages/utils/categoryResolutionService';
import { aiService } from '@/pages/utils/aiService';
import { fetchSupplierProductsForContext, buildSupplierContextSummary, type SupplierProductSummary } from '@/pages/utils/inboundNfe/inboundSupplierProductContext';
import { itemCostWithAdditionalCosts } from '@/pages/utils/inboundNfe/inboundItemCosts';
import { useInboundInvoiceProductCreation } from './useInboundInvoiceProductCreation';
import { resolveLinkedProductDetails, enrichInboundItemsWithProductDetails, isGenericOrEmptyProductName } from '@/pages/utils/inboundNfe/inboundItemProductResolver';
import { useInboundInvoiceSuggestions, type InboundSuggestion } from './useInboundInvoiceSuggestions';
import { useInboundInvoiceQuickRegister } from './useInboundInvoiceQuickRegister';
import { toast } from 'react-toastify';
import { useInboundInvoiceClassification, type AiClassification } from './useInboundInvoiceClassification';

export interface UseInboundInvoiceItemsReviewParams {
    items: InboundInvoiceItem[];
    supplierId?: string;
    suppliers: Person[];
    onChange: (itemNumber: number, update: Partial<InboundInvoiceItem>) => void;
    onProcessingSuggestionsChange?: (processing: boolean) => void;
    suggestionsEnabled?: boolean;
}

/** Sugestões de vínculos determinísticas (sem IA, execução 100% local) */
export const INBOUND_SUGGESTIONS_FEATURE_ENABLED = true;

export function useInboundInvoiceItemsReview({
    items,
    supplierId,
    suppliers,
    onChange,
    onProcessingSuggestionsChange,
    suggestionsEnabled = true,
}: UseInboundInvoiceItemsReviewParams) {
    const isSuggestionsActuallyEnabled = INBOUND_SUGGESTIONS_FEATURE_ENABLED && Boolean(supplierId?.trim()) && suggestionsEnabled;
    const { suggestionFor, rejectSuggestion, isProcessingSuggestions, isItemProcessing, retrySuggestions } = useInboundInvoiceSuggestions({
        items,
        supplierId,
        enabled: isSuggestionsActuallyEnabled,
    });

    const [acceptingSuggestion, setAcceptingSuggestion] = useState<number | null>(null);
    const [removingLink, setRemovingLink] = useState<number | null>(null);
    const removalInProgress = useRef(false);

    useEffect(() => {
        onProcessingSuggestionsChange?.(acceptingSuggestion !== null || removingLink !== null);
        return () => onProcessingSuggestionsChange?.(false);
    }, [acceptingSuggestion, removingLink, onProcessingSuggestionsChange]);

    // Auto-enriquece itens que possuem matchedProductId mas ainda estão sem código ou com nome genérico
    useEffect(() => {
        let active = true;
        const needsEnrichment = items.some(
            (item) => item.matchedProductId && (!item.linkedProductCode || isGenericOrEmptyProductName(item.productErpName))
        );
        if (!needsEnrichment) return;

        void enrichInboundItemsWithProductDetails(items).then((enriched) => {
            if (!active) return;
            enriched.forEach((item) => {
                const current = items.find((i) => i.itemNumber === item.itemNumber);
                if (
                    current &&
                    (current.linkedProductCode !== item.linkedProductCode || current.productErpName !== item.productErpName)
                ) {
                    onChange(item.itemNumber, {
                        linkedProductCode: item.linkedProductCode,
                        productErpName: item.productErpName,
                    });
                }
            });
        });

        return () => {
            active = false;
        };
    }, [items, onChange]);

    const {
        quickRegisterTarget,
        setQuickRegisterTarget,
        handleQuickRegisterConfirm,
        isPreparingProduct,
        setIsPreparingProduct,
        creatingItemNumber,
        setCreatingItemNumber,
        creatingVariationId,
        setCreatingVariationId,
        editingParentProduct,
        setEditingParentProduct,
        initialProductData,
        setInitialProductData,
        isProductModalOpen,
        setIsProductModalOpen,
        suggestedCategory,
        setSuggestedCategory,
        editProduct,
        closeProductModal
    } = useInboundInvoiceQuickRegister(supplierId);


    const {
        isClassifying,
        aiClassification,
        setAiClassification,
        classifyingItem,
        setClassifyingItem,
        classifyWithAI,
        resetClassification
    } = useInboundInvoiceClassification(supplierId);

    const [individualItem, setIndividualItem] = useState<InboundInvoiceItem | null>(null);
    const [individualMarkup, setIndividualMarkup] = useState('');

    const linkedCount = useMemo(() => items.filter((item) => Boolean(item.matchedProductId)).length, [items]);
    const unlinkedItems = useMemo(() => items.filter((item) => !item.matchedProductId), [items]);
    const creatingItem = useMemo(() => items.find((item) => item.itemNumber === creatingItemNumber), [items, creatingItemNumber]);
    const supplier = useMemo(() => suppliers.find((person) => person.id === supplierId), [suppliers, supplierId]);
    const effectiveMarkup = individualMarkup;
    const setEffectiveMarkup = setIndividualMarkup;



    const removeLink = async (item: InboundInvoiceItem) => {
        if (removalInProgress.current) return;
        removalInProgress.current = true;
        setRemovingLink(item.itemNumber);
        try {
            if (supplierId && item.productCode) await deleteProductSupplierCode(supplierId, item.productCode);
            rejectSuggestion(item);
            onChange(item.itemNumber, { matchedProductId: undefined, matchedVariationId: undefined, linkedProductCode: undefined, productErpName: undefined });
            toast.success('Vínculo e associação do código do fornecedor removidos.');
        } catch (error) {
            console.error('Erro ao remover vínculo do fornecedor:', error);
            toast.error('Não foi possível remover o vínculo. Tente novamente.');
        } finally {
            removalInProgress.current = false;
            setRemovingLink(null);
        }
    };

    const {
        creationQueue,
        isSuggestingName,
        startCreation,
        classifyAndStart,
        confirmExistingVariationLink,
        confirmNewVariationInFamily,
        discardClassificationAndCreateNew,
        handleCreatedProductFromModal,
    } = useInboundInvoiceProductCreation({
        items,
        supplierId,
        onChange,
        setCreatingItemNumber,
        setCreatingVariationId,
        setIsPreparingProduct,
        setSuggestedCategory,
        setInitialProductData,
        setIsProductModalOpen,
        creatingItemNumber,
        creatingVariationId,
        aiClassification,
        setAiClassification,
        classifyingItem,
        classifyWithAI,
        resetClassification,
        effectiveMarkup,
        setIndividualMarkup: setEffectiveMarkup,
    });

    const requestIndividualCreation = (item: InboundInvoiceItem) => {
        if (!supplierId) return toast.info('Vincule o fornecedor para identificar ou cadastrar os produtos.');
        setIndividualItem(item);
        setIndividualMarkup('');
    };

    const confirmIndividualCreation = () => {
        if (!individualItem) return;
        const item = individualItem;
        const markup = individualMarkup;
        setIndividualItem(null);
        void classifyAndStart(item, [], markup);
    };

    const selectProduct = async (itemNumber: number, product: Product, variation?: Variation) => {
        const matchedProductId = product.id;
        const matchedVariationId = variation?.id;
        const linkedProductCode = variation?.sku || product.code || '';
        const productErpName = variation?.name || variation?.title || product.name || product.title || '';

        if (supplierId) {
            const item = items.find((i) => i.itemNumber === itemNumber);
            if (item) {
                try {
                    await saveProductSupplierCode({
                        supplierId,
                        productId: matchedProductId,
                        productVariationId: matchedVariationId,
                        supplierProductCode: item.productCode,
                        supplierDescription: item.productDescription,
                    });
                } catch (err) {
                    console.warn('Erro ao salvar código de fornecedor do produto:', err);
                }
            }
        }

        onChange(itemNumber, {
            matchedProductId,
            matchedVariationId,
            linkedProductCode,
            productErpName,
        });
        toast.success(`Item vinculado a "${productErpName}"`);
    };

    const acceptSuggestion = async (item: InboundInvoiceItem, suggestion: InboundSuggestion) => {
        setAcceptingSuggestion(item.itemNumber);
        try {
            const product = await getFullProduct(suggestion.productId);
            const variation = product?.variations?.find((candidate) => candidate.id === suggestion.variationId);
            if (!product || (suggestion.variationId && !variation)) throw new Error('Produto ou variação indisponível. Pesquise novamente.');
            await selectProduct(item.itemNumber, product, variation);
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Não foi possível aceitar a sugestão.');
        } finally {
            setAcceptingSuggestion(null);
        }
    };



    return {
        // Estatísticas e listas
        linkedCount,
        unlinkedItems,
        creatingItem,
        supplier,
        // Sugestões
        suggestionFor,
        rejectSuggestion,
        retrySuggestions,
        isProcessingSuggestions,
        acceptingSuggestion,
        acceptSuggestion,
        // Ações de produto
        selectProduct,
        removeLink,
        removingLink,
        requestIndividualCreation,
        // Estado individual
        individualItem,
        setIndividualItem,
        individualMarkup,
        setIndividualMarkup,
        confirmIndividualCreation,
        effectiveMarkup,
        setEffectiveMarkup,
        // Modais e IA
        isPreparingProduct,
        isClassifying,
        classifyingItem,
        aiClassification,
        confirmExistingVariationLink,
        confirmNewVariationInFamily,
        discardClassificationAndCreateNew,
        // Cadastro rápido
        quickRegisterTarget,
        setQuickRegisterTarget,
        handleQuickRegisterConfirm,
        // Modal completo de produto
        isProductModalOpen,
        editingParentProduct,
        initialProductData,
        closeProductModal,
        handleCreatedProductFromModal,
        editProduct,
    };
}
