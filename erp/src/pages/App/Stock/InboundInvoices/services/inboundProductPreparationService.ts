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
    const category = categories.find((candidate) => candidate.name.toLocaleLowerCase() === String(categorySuggestion.category || '').toLocaleLowerCase()) || categories[0];
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
                stock: item.quantity || 0,
                unitPrice: salePrice as any,
                costPrice: finalCost,
                finalPurchasePrice: finalCost,
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
        finalPurchasePrice: finalCost,
        unitPrice: salePrice,
        stock: item.quantity || 0,
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
