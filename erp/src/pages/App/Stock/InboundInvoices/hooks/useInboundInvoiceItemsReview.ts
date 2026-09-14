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
import { prepareNewParentWithVariation, prepareExistingParentNewVariation } from '../services/inboundProductPreparationService';
import { resolveLinkedProductDetails, enrichInboundItemsWithProductDetails, isGenericOrEmptyProductName } from '@/pages/utils/inboundNfe/inboundItemProductResolver';
import { useInboundInvoiceSuggestions, type InboundSuggestion } from './useInboundInvoiceSuggestions';
import type { QuickRegisterItem, QuickRegisterSelection } from '../modals/QuickRegisterVariationModal';
import { toast } from 'react-toastify';

export interface AiClassification {
    decision: 'EXISTING_VARIATION' | 'NEW_VARIATION_OF_EXISTING_PRODUCT' | 'NEW_PRODUCT' | 'UNSURE';
    matchedProductId: string | null;
    matchedVariationId: string | null;
    normalizedParentName: string;
    extractedAttributes: { color: string | null; measure: string | null; material: string | null };
    confidence: number;
    reasons: string[];
}

export interface UseInboundInvoiceItemsReviewParams {
    items: InboundInvoiceItem[];
    supplierId?: string;
    suppliers: Person[];
    onChange: (itemNumber: number, update: Partial<InboundInvoiceItem>) => void;
    onProcessingSuggestionsChange?: (processing: boolean) => void;
    suggestionsEnabled?: boolean;
}

/** Flag de controle de recurso: sugestão de vínculos desativada a pedido do usuário; código preservado para futura ativação */
export const INBOUND_SUGGESTIONS_FEATURE_ENABLED = false;

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

    const [creatingItemNumber, setCreatingItemNumber] = useState<number | null>(null);
    // No cadastro rápido de uma nova variação, esta é a identidade que deve
    // receber o vínculo da NF. Nunca inferir pela posição no array do pai.
    const [creatingVariationId, setCreatingVariationId] = useState<string | null>(null);
    const [creationQueue, setCreationQueue] = useState<number[]>([]);
    const [initialProductData, setInitialProductData] = useState<Partial<Product> | null>(null);
    const [isSuggestingName, setIsSuggestingName] = useState(false);
    const [individualItem, setIndividualItem] = useState<InboundInvoiceItem | null>(null);
    const [individualMarkup, setIndividualMarkup] = useState('');
    const [suggestedCategory, setSuggestedCategory] = useState<{ id: string; name: string } | null>(null);
    const [isPreparingProduct, setIsPreparingProduct] = useState(false);
    const [isProductModalOpen, setIsProductModalOpen] = useState(false);
    const [editingParentProduct, setEditingParentProduct] = useState<Product | null>(null);
    const [quickRegisterTarget, setQuickRegisterTarget] = useState<{ itemNumber: number; item: QuickRegisterItem } | null>(null);

    // IA com contexto de fornecedor
    const [isClassifying, setIsClassifying] = useState(false);
    const [aiClassification, setAiClassification] = useState<AiClassification | null>(null);
    const [classifyingItem, setClassifyingItem] = useState<InboundInvoiceItem | null>(null);

    // Cache de produtos do fornecedor
    const supplierProductsCacheRef = useRef<{ supplierId: string; products: SupplierProductSummary[] } | null>(null);

    const linkedCount = useMemo(() => items.filter((item) => Boolean(item.matchedProductId)).length, [items]);
    const unlinkedItems = useMemo(() => items.filter((item) => !item.matchedProductId), [items]);
    const creatingItem = useMemo(() => items.find((item) => item.itemNumber === creatingItemNumber), [items, creatingItemNumber]);
    const supplier = useMemo(() => suppliers.find((person) => person.id === supplierId), [suppliers, supplierId]);
    const effectiveMarkup = individualMarkup;
    const setEffectiveMarkup = setIndividualMarkup;

    const getSupplierProducts = async (): Promise<SupplierProductSummary[]> => {
        if (!supplierId) return [];
        if (supplierProductsCacheRef.current?.supplierId === supplierId) return supplierProductsCacheRef.current.products;
        const products = await fetchSupplierProductsForContext(supplierId);
        supplierProductsCacheRef.current = { supplierId, products };
        return products;
    };

    useEffect(() => {
        if (supplierId && supplierProductsCacheRef.current?.supplierId !== supplierId) {
            supplierProductsCacheRef.current = null;
        }
    }, [supplierId]);

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

    const advanceQueue = (queue: number[]) => {
        setCreationQueue(queue);
        if (queue.length) {
            const next = items.find((item) => item.itemNumber === queue[0] && !item.matchedProductId);
            if (next) void classifyAndStart(next, queue);
        }
    };

    const startCreation = async (item: InboundInvoiceItem, queue: number[] = [], family?: { id: string; name: string }, markupInput?: string) => {
        if (!supplierId) return toast.info('Vincule o fornecedor para identificar ou cadastrar os produtos.');
        setCreationQueue(queue);
        setCreatingItemNumber(item.itemNumber);
        setCreatingVariationId(null);
        setIsSuggestingName(true);
        setIsPreparingProduct(true);
        try {
            const suggestion = await aiService.generateMarketplaceTitle({ description: item.productDescription });
            const { categories } = await fetchGroupsAndCategories();
            const activeCategories = (categories || []).filter((category) => category.active !== false);
            const resolvedCategory = await resolveAutoCategory(suggestion.title, activeCategories);

            const finalCost = itemCostWithAdditionalCosts(item);
            const markup = markupInput ? Number(markupInput.replace(',', '.')) : 0;
            const salePrice = Number.isFinite(markup) && markup > 0 ? Number((finalCost * (1 + markup / 100)).toFixed(2)) : 0;

            setSuggestedCategory(resolvedCategory ? { id: resolvedCategory.id, name: resolvedCategory.name || resolvedCategory.category || '' } : null);
            setInitialProductData({
                name: suggestion.title,
                title: suggestion.title,
                description: '',
                unit: item.unit || 'UN',
                itemType: 'product',
                active: true,
                isDraft: false,
                status: 'hidden',
                mainSupplierId: supplierId,
                supplierId,
                supplierIds: [supplierId],
                supplierRef: item.productCode || undefined,
                categoryIds: resolvedCategory ? [resolvedCategory.id] : [],
                parentId: family?.id,
                costPrice: finalCost,
                unitPrice: salePrice,
                stock: 0,
                fiscal: { ncm: item.ncm || undefined, cest: item.cest || undefined, cfop: item.cfop || undefined },
                ecommerceSync: false,
                whatsappSync: false,
            });
            setIsProductModalOpen(true);
        } catch (error: any) {
            setInitialProductData(null);
            setCreatingItemNumber(null);
            toast.error(error.message || 'Não foi possível preparar categoria e dados obrigatórios do produto.');
        } finally {
            setIsSuggestingName(false);
            setIsPreparingProduct(false);
        }
    };

    const classifyAndStart = async (item: InboundInvoiceItem, queue: number[] = [], markupInput?: string) => {
        if (!supplierId) return toast.info('Vincule o fornecedor para identificar ou cadastrar os produtos.');
        if (item.productCode) {
            const existing = await findProductSupplierCodes(supplierId, [item.productCode]);
            const match = existing.get(item.productCode.trim().toLocaleUpperCase('pt-BR'));
            if (match) {
                const details = await resolveLinkedProductDetails(match.productId, match.productVariationId);
                onChange(item.itemNumber, {
                    matchedProductId: match.productId,
                    matchedVariationId: match.productVariationId,
                    linkedProductCode: details?.linkedProductCode,
                    productErpName: details?.productErpName || 'Produto vinculado',
                });
                toast.info('Este código do fornecedor já possui um produto vinculado.');
                return;
            }
        }
        setIsClassifying(true);
        setClassifyingItem(item);
        setCreationQueue(queue);
        try {
            const supplierProducts = await getSupplierProducts();
            if (!supplierProducts.length) {
                setIsClassifying(false);
                void startCreation(item, queue, undefined, markupInput);
                return;
            }
            const contextSummary = buildSupplierContextSummary(supplierProducts);
            const classification = await aiService.classifyInboundItemWithSupplierContext({
                itemDescription: item.productDescription,
                itemProductCode: item.productCode || undefined,
                supplierContextSummary: contextSummary,
            });
            setIsClassifying(false);
            if (classification.decision === 'NEW_PRODUCT' || classification.decision === 'UNSURE' || !classification.matchedProductId) {
                void startCreation(item, queue, undefined, markupInput);
                return;
            }
            setAiClassification(classification);
        } catch {
            setIsClassifying(false);
            void startCreation(item, queue, undefined, markupInput);
        }
    };

    const confirmExistingVariationLink = async () => {
        if (!classifyingItem || !aiClassification?.matchedProductId) return;
        const details = await resolveLinkedProductDetails(aiClassification.matchedProductId, aiClassification.matchedVariationId || undefined);
        onChange(classifyingItem.itemNumber, {
            matchedProductId: aiClassification.matchedProductId,
            matchedVariationId: aiClassification.matchedVariationId || undefined,
            linkedProductCode: details?.linkedProductCode,
            productErpName: details?.productErpName || aiClassification.normalizedParentName || 'Variação vinculada pela IA',
        });
        toast.success('Item vinculado à variação existente identificada pela IA.');
        const queue = creationQueue.filter((n) => n !== classifyingItem.itemNumber);
        setAiClassification(null);
        setClassifyingItem(null);
        advanceQueue(queue);
    };

    const confirmNewVariationInFamily = async () => {
        if (!classifyingItem || !aiClassification?.matchedProductId || !supplierId) return;
        const markup = Number(effectiveMarkup.replace(',', '.'));
        if (!Number.isFinite(markup) || markup < 0) return toast.error('Informe um acréscimo válido sobre o custo final.');
        try {
            const family = await getFullProduct(aiClassification.matchedProductId);
            if (!family) throw new Error('Produto pai sugerido não encontrado no ERP.');
            const finalCost = itemCostWithAdditionalCosts(classifyingItem);
            const attributes: Variation['attributes'] = [];
            const variationId = crypto.randomUUID();
            await saveVariation(family.id, {
                id: variationId,
                name: classifyingItem.productDescription,
                attributes,
                unitPrice: Number((finalCost * (1 + markup / 100)).toFixed(2)),
                costPrice: finalCost,
                stock: 0,
                syncUnitPrice: false,
                syncPromoPrice: false,
                syncDescription: true,
                syncWidth: true,
                images: [],
            });
            await saveProductSupplierCode({
                supplierId,
                productId: family.id,
                productVariationId: variationId,
                supplierProductCode: classifyingItem.productCode,
                supplierDescription: classifyingItem.productDescription,
                normalizedDescription: aiClassification.normalizedParentName,
            });
            onChange(classifyingItem.itemNumber, {
                matchedProductId: family.id,
                matchedVariationId: variationId,
                productErpName: `${family.name || family.title} — ${classifyingItem.productDescription}`,
            });
            toast.success(`Variação cadastrada no produto pai "${family.name || family.title}".`);
            const queue = creationQueue.filter((n) => n !== classifyingItem.itemNumber);
            setAiClassification(null);
            setClassifyingItem(null);
            advanceQueue(queue);
        } catch (error: any) {
            toast.error(error.message || 'Não foi possível cadastrar a variação no produto pai.');
        }
    };

    const discardClassificationAndCreateNew = () => {
        const item = classifyingItem;
        const queue = [...creationQueue];
        setAiClassification(null);
        setClassifyingItem(null);
        if (item) void startCreation(item, queue);
    };

    const handleQuickRegisterConfirm = async (selection: QuickRegisterSelection) => {
        if (!quickRegisterTarget) return;
        const { itemNumber, item } = quickRegisterTarget;
        setQuickRegisterTarget(null);

        if (selection.mode === 'EXISTING_PARENT') {
            try {
                setIsPreparingProduct(true);
                const parentProduct = await getFullProduct(selection.parentProductId);
                if (!parentProduct) {
                    setIsPreparingProduct(false);
                    toast.error('Produto pai não encontrado.');
                    return;
                }

                const updatedParentProduct = await prepareExistingParentNewVariation(parentProduct, item);

                setIsPreparingProduct(false);
                setCreatingItemNumber(itemNumber);
                setCreatingVariationId(updatedParentProduct.variations?.[updatedParentProduct.variations.length - 1]?.id || null);
                setEditingParentProduct(updatedParentProduct);
                setIsProductModalOpen(true);
            } catch (err: any) {
                setIsPreparingProduct(false);
                toast.error(err.message || 'Erro ao carregar produto pai.');
            }
        } else {
            try {
                setIsPreparingProduct(true);
                const preparedData = await prepareNewParentWithVariation(item, supplierId);
                setIsPreparingProduct(false);

                setCreatingItemNumber(itemNumber);
                setCreatingVariationId(preparedData.variations?.[0]?.id || null);
                setEditingParentProduct(null);
                setInitialProductData(preparedData);
                setIsProductModalOpen(true);
            } catch (err: any) {
                setIsPreparingProduct(false);
                toast.error(err.message || 'Erro ao preparar formulário de cadastro.');
            }
        }
    };

    const handleCreatedProductFromModal = async (createdProduct: Product) => {
        setIsProductModalOpen(false);
        if (!creatingItemNumber || !supplierId) return;

        const currentItem = items.find((item) => item.itemNumber === creatingItemNumber);
        if (currentItem) {
            try {
                // Recarrega para usar os UUIDs/SKUs efetivamente persistidos.
                // `variations[0]` pode ser outra cor do mesmo pai.
                let productToUse = createdProduct;
                if (productToUse.id) {
                    const reloaded = await getFullProduct(productToUse.id);
                    if (reloaded) productToUse = reloaded;
                }
                const variation = creatingVariationId
                    ? productToUse.variations?.find((candidate) => candidate.id === creatingVariationId)
                    : productToUse.variations?.[0];
                if (creatingVariationId && !variation) {
                    throw new Error('A variação recém-cadastrada não foi encontrada. O vínculo não foi salvo em outra variação.');
                }
                const resolvedCode = (variation?.sku || productToUse.code || productToUse.sku || '').trim();
                const resolvedName = (variation?.name || variation?.title || productToUse.name || productToUse.title || currentItem.productDescription).trim();

                await saveProductSupplierCode({
                    supplierId,
                    productId: productToUse.id || createdProduct.id,
                    productVariationId: variation?.id,
                    supplierProductCode: currentItem.productCode,
                    supplierDescription: currentItem.productDescription,
                });
                onChange(currentItem.itemNumber, {
                    matchedProductId: productToUse.id || createdProduct.id,
                    matchedVariationId: variation?.id,
                    linkedProductCode: resolvedCode,
                    productErpName: resolvedName,
                });
                toast.success(`Produto "${resolvedName}" cadastrado e vinculado.`);
            } catch (error: any) {
                toast.error('Produto cadastrado, mas não foi possível vincular o código do fornecedor.');
            }
        }
        const nextQueue = creationQueue.filter((itemNumber) => itemNumber !== creatingItemNumber);
        setCreatingItemNumber(null);
        setCreatingVariationId(null);
        setInitialProductData(null);
        setSuggestedCategory(null);
        setIndividualMarkup('');
        advanceQueue(nextQueue);
    };

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

    const closeProductModal = () => {
        setIsProductModalOpen(false);
        setCreatingItemNumber(null);
        setCreatingVariationId(null);
        setEditingParentProduct(null);
        setInitialProductData(null);
        setSuggestedCategory(null);
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
    };
}
