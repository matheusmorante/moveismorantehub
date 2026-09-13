import { InboundInvoiceItem } from '@/pages/utils/inboundNfe/inboundNfeTypes';
import Product, { Variation } from '@/pages/types/product.type';
import { aiService } from '@/pages/utils/aiService';
import { fetchGroupsAndCategories } from '@/pages/utils/categoryService';
import { ensureAttributeValue } from '@/pages/utils/variationService';
import { itemCostWithAdditionalCosts } from '@/pages/utils/inboundNfe/inboundItemCosts';
import { extractColorCandidateFromTitle } from '@/pages/utils/inboundNfe/inboundMatchingRules';

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
    const { categories } = await fetchGroupsAndCategories();
    const categoryNames = categories.filter((category) => category.active !== false).map((category) => category.name);
    const categorySuggestion = await aiService.suggestCategory(suggestion.title, categoryNames);
    const suggestedCatName = typeof categorySuggestion === 'string' ? categorySuggestion : (categorySuggestion?.category || '');
    const category = categories.find((candidate) => candidate.name.trim().toLowerCase() === suggestedCatName.trim().toLowerCase()) || categories[0];
    if (!category) throw new Error('Nenhuma categoria existente foi encontrada para o produto.');

    const finalCost = itemCostWithAdditionalCosts(item);
    const markup = markupInput ? Number(markupInput.replace(',', '.')) : 0;
    const salePrice = Number.isFinite(markup) && markup > 0 ? Number((finalCost * (1 + markup / 100)).toFixed(2)) : undefined;

    // Extração de cor inteligente via IA com fallback para regras locais
    let detectedColor = await aiService.extractProductColor(item.productDescription);
    if (!detectedColor) {
        detectedColor = extractColorCandidateFromTitle(item.productDescription);
    }

    let initialVariations: Variation[] | undefined = undefined;
    if (detectedColor) {
        try {
            const colorAttribute = await ensureAttributeValue('Cor', detectedColor);
            const varId = crypto.randomUUID();
            const varName = `${suggestion.title} ${colorAttribute.value}`.trim();
            initialVariations = [{
                id: varId,
                sku: '',
                name: varName,
                stock: 0,
                unitPrice: salePrice as any,
                costPrice: finalCost,
                active: true,
                attributes: [{ name: colorAttribute.name, value: colorAttribute.value }],
                images: [],
                syncUnitPrice: true,
                syncPromoPrice: true,
                syncCostPrice: true,
                syncDescription: true,
                syncWidth: true,
                syncHeight: true,
                syncDepth: true,
                syncWeight: true,
            }];
        } catch (attrErr) {
            console.warn('[prepareInboundProductData] Não foi possível vincular atributo de cor global:', attrErr);
        }
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
        categoryIds: [category.id],
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
        suggestedCategory: { id: category.id, name: category.name },
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

    // 1. Categoria sugerida por IA ou lista de categorias ativas
    let catObj: { id: string; name: string } | null = null;
    try {
        const { categories } = await fetchGroupsAndCategories();
        const aiCat = await aiService.suggestCategoryForProduct(item.productDescription);
        if (aiCat?.categoryName && categories) {
            const found = categories.find(
                (c: any) => c.name.toLowerCase() === aiCat.categoryName.toLowerCase()
            );
            if (found) catObj = { id: found.id, name: found.name };
        }
        if (!catObj && categories && categories.length > 0) {
            const activeCat = categories.find((c: any) => c.active !== false) || categories[0];
            if (activeCat) catObj = { id: activeCat.id, name: activeCat.name };
        }
    } catch (err) {
        console.warn('[prepareNewParentWithVariation] Erro ao buscar categoria sugerida:', err);
    }

    // 2. Extração de cor inteligente via IA com fallback local
    let detectedColor = await aiService.extractProductColor(item.productDescription);
    if (!detectedColor) {
        detectedColor = extractColorCandidateFromTitle(item.productDescription);
    }

    let colorAttribute: { name: string; value: string } | null = null;
    let parentName = item.productDescription.trim();

    if (detectedColor) {
        try {
            colorAttribute = await ensureAttributeValue('Cor', detectedColor);
        } catch (attrErr) {
            console.warn('[prepareNewParentWithVariation] Falha ao garantir atributo de cor:', attrErr);
            const formattedVal = detectedColor
                .split(' ')
                .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
                .join(' ');
            colorAttribute = { name: 'Cor', value: formattedVal };
        }

        // Limpa a cor do final do nome do pai para evitar redundância (ex: "COMODA 4 GAVETAS PRETO" -> "COMODA 4 GAVETAS")
        const escapedColor = detectedColor.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const colorRegex = new RegExp(`[\\s\\/-]+${escapedColor}$`, 'i');
        const cleanedName = parentName.replace(colorRegex, '').trim();
        if (cleanedName.length >= 3) {
            parentName = cleanedName;
        }
    }

    // 3. Montar a variação inicial com os atributos
    const initialVariationId = crypto.randomUUID();
    const initialVariation: Variation = {
        id: initialVariationId,
        sku: item.productCode || '',
        name: item.productDescription,
        stock: 0,
        unitPrice: undefined as any,
        costPrice: finalCost,
        active: true,
        attributes: colorAttribute ? [{ name: colorAttribute.name, value: colorAttribute.value }] : [],
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
        name: parentName,
        title: parentName,
        description: '',
        ncm: item.ncm || '',
        fiscal: { ncm: item.ncm || undefined },
        costPrice: finalCost,
        unitPrice: undefined,
        stock: 0,
        mainSupplierId: supplierId || undefined,
        supplierId,
        supplierIds: supplierId ? [supplierId] : [],
        categoryIds: catObj ? [catObj.id] : [],
        categories: catObj ? [{ id: catObj.id, name: catObj.name }] : [],
        hasVariations: true,
        variations: [initialVariation],
    };
}

/**
 * Prepara uma nova variação para ser vinculada a um produto pai existente.
 */
export async function prepareExistingParentNewVariation(
    parentProduct: Product,
    item: QuickItemPayload
): Promise<Product> {
    const finalCost = item.finalCost || item.unitCost || 0;

    let detectedColor = await aiService.extractProductColor(item.productDescription);
    if (!detectedColor) {
        detectedColor = extractColorCandidateFromTitle(item.productDescription);
    }

    let colorAttribute: { name: string; value: string } | null = null;
    if (detectedColor) {
        try {
            colorAttribute = await ensureAttributeValue('Cor', detectedColor);
        } catch (err) {
            console.warn('[prepareExistingParentNewVariation] Não foi possível garantir o atributo de Cor:', err);
            const formattedVal = detectedColor
                .split(' ')
                .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
                .join(' ');
            colorAttribute = { name: 'Cor', value: formattedVal };
        }
    }

    const newVarId = crypto.randomUUID();
    const newVar: Variation = {
        id: newVarId,
        sku: item.productCode || '',
        name: item.productDescription,
        stock: 0,
        unitPrice: parentProduct.unitPrice || (undefined as any),
        costPrice: finalCost,
        active: true,
        attributes: colorAttribute ? [{ name: colorAttribute.name, value: colorAttribute.value }] : [],
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

