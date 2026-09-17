import { InboundInvoiceItem } from '@/pages/utils/inboundNfe/inboundNfeTypes';
import Product, { Variation } from '@/pages/types/product.type';
import { fetchGroupsAndCategories } from '@/pages/utils/categoryService';
import { itemCostWithAdditionalCosts } from '@/pages/utils/inboundNfe/inboundItemCosts';
import { generateVariationSku, getNextSequentialProductCode } from '@/pages/utils/productService/productSkuService';
import { resolveAutoCategory } from '@/pages/utils/categoryResolutionService';
import { aiService } from '@/pages/utils/aiService';

interface PrepareProductCreateParams {
    item: InboundInvoiceItem;
    supplierId?: string;
    family?: { id: string; name: string };
    markupInput?: string;
}

export interface PreparedProductDataResult {
    initialProductData: Partial<Product>;
    suggestedCategory: { id: string; name: string };
}

export async function prepareInboundProductData({
    item,
    supplierId,
    family,
    markupInput,
}: PrepareProductCreateParams): Promise<PreparedProductDataResult> {
    const suggestion = await aiService.generateMarketplaceTitle({ description: item.productDescription });

    const finalCost = itemCostWithAdditionalCosts(item);
    const markup = markupInput ? Number(markupInput.replace(',', '.')) : 0;
    const salePrice = Number.isFinite(markup) && markup > 0 ? Number((finalCost * (1 + markup / 100)).toFixed(2)) : undefined;

    // Variações e atributos devem ser definidos manualmente pelo usuário
    const initialVariations: Variation[] | undefined = undefined;

    let autoCategoryIds: string[] = [];
    let autoCategories: string[] = [];
    let autoCategoryName = '';
    try {
        const categoryResponse = await fetchGroupsAndCategories();
        const activeCategories = (categoryResponse?.categories || []).filter((c: any) => c.active !== false);
        const resolved = await resolveAutoCategory(suggestion.title, activeCategories);
        if (resolved) {
            autoCategoryIds = [resolved.id];
            autoCategories = [resolved.name || resolved.category || ''];
            autoCategoryName = resolved.name || resolved.category || '';
        }
    } catch (catErr) {
        console.warn('[prepareInboundProductData] Falha ao resolver categoria automática:', catErr);
    }

    const initialProductData: Partial<Product> = {
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
        supplierIds: supplierId ? [supplierId] : [],
        supplierRef: item.productCode || undefined,
        categoryIds: autoCategoryIds,
        parentId: family?.id,
        costPrice: finalCost,
        unitPrice: salePrice,
        stock: 0,
        hasVariations: true,
        variations: initialVariations,
        fiscal: { ncm: item.ncm || undefined, cest: item.cest || undefined, cfop: item.cfop || undefined },
        ecommerceSync: false,
        whatsappSync: false,
    };

    return {
        initialProductData,
        suggestedCategory: autoCategoryIds.length > 0 ? { id: autoCategoryIds[0], name: autoCategoryName } : { id: '', name: '' },
    };
}

export interface QuickItemPayload {
    productDescription: string;
    productCode?: string;
    unit?: string;
    ncm?: string;
    quantity?: number;
    unitCost?: number;
    finalCost?: number;
}

/**
 * Prepara os dados iniciais para a criação de um Novo Produto Pai com a primeira Variação.
 * Extrai a cor do item da NF (via IA ou heurística), garante o cadastro global do atributo Cor,
 * limpa o nome do pai para não duplicar a cor no título do pai e insere a variação com attributes.
 */
export async function prepareNewParentWithVariation(
    item: QuickItemPayload,
    supplierId?: string
): Promise<Partial<Product>> {
    const finalCost = item.finalCost || item.unitCost || 0;

    const parentName = item.productDescription.trim();

    // 2. Montar a variação inicial sem atributos automáticos (deve ser configurada manualmente pelo usuário)
    const initialVariationId = crypto.randomUUID();
    const parentCode = await getNextSequentialProductCode();
    const initialVariation: Variation = {
        id: initialVariationId,
        sku: generateVariationSku(parentCode, []),
        name: parentName,
        stock: 0,
        unitPrice: undefined as any,
        costPrice: finalCost,
        active: true,
        attributes: [],
        images: [],
        syncUnitPrice: true,
        syncPromoPrice: true,
        syncCostPrice: true,
        syncDescription: true,
        syncWidth: true,
        syncHeight: true,
        syncDepth: true,
        syncWeight: true,
    };

    // 4. Selecionar automaticamente a categoria mais adequada para o produto
    let autoCategoryIds: string[] = [];
    let autoCategories: string[] = [];
    let autoCategoryName = '';
    try {
        const categoryResponse = await fetchGroupsAndCategories();
        const activeCategories = (categoryResponse?.categories || []).filter((c: any) => c.active !== false);
        const resolved = await resolveAutoCategory(parentName, activeCategories);
        if (resolved) {
            autoCategoryIds = [resolved.id];
            autoCategories = [resolved.name || resolved.category || ''];
            autoCategoryName = resolved.name || resolved.category || '';
        }
    } catch (catErr) {
        console.warn('[prepareNewParentWithVariation] Falha ao resolver categoria automática:', catErr);
    }

    return {
        name: parentName,
        code: parentCode,
        title: parentName,
        description: '',
        fiscal: { ncm: item.ncm || undefined },
        costPrice: finalCost,
        unitPrice: undefined,
        stock: 0,
        mainSupplierId: supplierId || undefined,
        supplierId,
        supplierIds: supplierId ? [supplierId] : [],
        categoryIds: autoCategoryIds,
        supplierRef: item.productCode || undefined,
        hasVariations: true,
        variations: [initialVariation],
    };
}

export async function prepareExistingParentNewVariation(
    parentProduct: Product,
    item: QuickItemPayload
): Promise<Product> {
    const finalCost = item.finalCost || item.unitCost || 0;

    const newVarId = crypto.randomUUID();
    const newVar: Variation = {
        id: newVarId,
        sku: generateVariationSku(parentProduct.code || '', parentProduct.variations || []),
        name: item.productDescription,
        stock: 0,
        unitPrice: parentProduct.unitPrice || (undefined as any),
        costPrice: finalCost,
        active: true,
        attributes: [],
        images: [],
        syncUnitPrice: true,
        syncPromoPrice: true,
        syncCostPrice: true,
        syncDescription: true,
        syncWidth: true,
        syncHeight: true,
        syncDepth: true,
        syncWeight: true,
    };

    return {
        ...parentProduct,
        hasVariations: true,
        variations: [...(parentProduct.variations || []), newVar],
    };
}

