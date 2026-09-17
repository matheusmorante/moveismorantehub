import { useState } from 'react';
import { toast } from 'react-toastify';
import type Product from '@/pages/types/product.type';
import type { Variation } from '@/pages/types/product.type';
import type { InboundInvoiceItem } from '@/pages/utils/inboundNfe/inboundNfeTypes';
import { findProductSupplierCodes, saveProductSupplierCode } from '@/pages/utils/productSupplierCodesService';
import { getFullProduct, saveVariation } from '@/pages/utils/productService';
import { fetchGroupsAndCategories } from '@/pages/utils/categoryService';
import { resolveAutoCategory } from '@/pages/utils/categoryResolutionService';
import { aiService } from '@/pages/utils/aiService';
import { itemCostWithAdditionalCosts } from '@/pages/utils/inboundNfe/inboundItemCosts';
import { resolveLinkedProductDetails } from '@/pages/utils/inboundNfe/inboundItemProductResolver';
import type { AiClassification } from './useInboundInvoiceClassification';

export interface UseInboundInvoiceProductCreationParams {
    items: InboundInvoiceItem[];
    supplierId?: string;
    onChange: (itemNumber: number, update: Partial<InboundInvoiceItem>) => void;
    setCreatingItemNumber: (val: number | null) => void;
    setCreatingVariationId: (val: string | null) => void;
    setIsPreparingProduct: (val: boolean) => void;
    setSuggestedCategory: (val: { id: string; name: string } | null) => void;
    setInitialProductData: (val: any) => void;
    setIsProductModalOpen: (val: boolean) => void;
    creatingItemNumber: number | null;
    creatingVariationId: string | null;
    aiClassification: AiClassification | null;
    setAiClassification: (val: AiClassification | null) => void;
    classifyingItem: InboundInvoiceItem | null;
    classifyWithAI: (item: InboundInvoiceItem) => Promise<AiClassification | null>;
    resetClassification: () => void;
    effectiveMarkup: string;
    setIndividualMarkup: (val: string) => void;
}

export function useInboundInvoiceProductCreation({
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
    setIndividualMarkup,
}: UseInboundInvoiceProductCreationParams) {
    const [creationQueue, setCreationQueue] = useState<number[]>([]);
    const [isSuggestingName, setIsSuggestingName] = useState(false);

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
        
        setCreationQueue(queue);
        const classification = await classifyWithAI(item);
        if (!classification || classification.decision === 'NEW_PRODUCT' || classification.decision === 'UNSURE' || !classification.matchedProductId) {
            void startCreation(item, queue, undefined, markupInput);
            return;
        }
        setAiClassification(classification);
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
        resetClassification();
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
            await saveVariation(family.id as string, {
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
                productId: family.id as string,
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
            resetClassification();
            advanceQueue(queue);
        } catch (error: any) {
            toast.error(error.message || 'Não foi possível cadastrar a variação no produto pai.');
        }
    };

    const discardClassificationAndCreateNew = () => {
        const item = classifyingItem;
        const queue = [...creationQueue];
        resetClassification();
        if (item) void startCreation(item, queue);
    };

    const handleCreatedProductFromModal = async (createdProduct: Product) => {
        setIsProductModalOpen(false);
        if (!creatingItemNumber || !supplierId) return;

        const currentItem = items.find((item) => item.itemNumber === creatingItemNumber);
        if (currentItem) {
            try {
                // Recarrega para usar os UUIDs/SKUs efetivamente persistidos.
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
                    productId: (productToUse.id || createdProduct.id) as string,
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

    return {
        creationQueue,
        isSuggestingName,
        startCreation,
        classifyAndStart,
        confirmExistingVariationLink,
        confirmNewVariationInFamily,
        discardClassificationAndCreateNew,
        handleCreatedProductFromModal,
    };
}
