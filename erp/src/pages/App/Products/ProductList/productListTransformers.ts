import Product from '../../../types/product.type';
import { parseVariationImages } from '@/pages/utils/productService';
import { normalizeVariationSku } from '@/pages/utils/productVariationDefaults';

/** Converte produtos paginados e suas variações em linhas próprias para a listagem. */
export function flattenProductsForList(products: Product[]): any[] {
    const flattened: any[] = [];

    products.forEach((product, productIndex) => {
        const parentSku = product.sku || product.code || String(productIndex + 1).padStart(6, '0');
        const hasJsonVariations = Array.isArray(product.variations) && product.variations.length > 0;
        const isParent = Boolean(product.hasVariations) || hasJsonVariations;
        const allVariations = hasJsonVariations
            ? product.variations!.map((variation: any, index: number) => buildVariationListRow(product, variation, index, parentSku))
            : [];

        // Regra do Pai no ERP: Ativo se ao menos uma variação estiver ativa; Desativado se todas estiverem desativadas
        const activeVariationsCount = hasJsonVariations
            ? product.variations!.filter((v: any) => v.active !== false).length
            : (product.active !== false ? 1 : 0);
        const totalVariationsCount = hasJsonVariations ? product.variations!.length : 1;
        const parentActive = hasJsonVariations
            ? activeVariationsCount > 0
            : (product.active !== false);

        flattened.push({
            ...product,
            active: parentActive,
            sku: parentSku,
            code: parentSku,
            isParent,
            allVariations,
            activeVariationsCount,
            totalVariationsCount,
        });

        if (hasJsonVariations) {
            product.variations!.forEach((variation: any, index: number) => {
                flattened.push(buildVariationListRow(product, variation, index, parentSku));
            });
        }
    });

    return flattened;
}

function buildVariationListRow(
    product: Product,
    variation: any,
    index: number,
    parentSku: string,
): any {
    const sku = variation.sku && String(variation.sku).trim()
        ? normalizeVariationSku(String(variation.sku).trim())
        : `${parentSku}-${String(index + 1).padStart(2, '0')}`;

    return {
        ...product,
        // `id` da linha de variação é sempre o UUID persistido. `rowId` é
        // apenas uma chave visual, sem qualquer uso de domínio.
        id: variation.id,
        rowId: `${product.id}:${variation.id || index}`,
        variationId: variation.id,
        mergedToVariationId: variation.mergedToVariationId || variation.merged_to_variation_id || undefined,
        productId: product.id,
        sku,
        code: sku,
        description: variation.name,
        displayName: variation.name,
        attributes: variation.attributes || [],
        syncUnitPrice: variation.syncUnitPrice !== false,
        syncPromoPrice: variation.syncPromoPrice !== false,
        syncDescription: variation.syncDescription !== false,
        syncWidth: variation.syncWidth !== false,
        syncHeight: variation.syncHeight !== false,
        syncDepth: variation.syncDepth !== false,
        syncWeight: variation.syncWeight !== false,
        unitPrice: variation.syncUnitPrice || typeof variation.unitPrice === 'undefined' || variation.unitPrice === null || variation.unitPrice === 0
            ? product.unitPrice
            : variation.unitPrice,
        costPrice: variation.syncCostPrice || typeof variation.costPrice === 'undefined' || variation.costPrice === null || variation.costPrice === 0
            ? product.costPrice
            : variation.costPrice,
        stock: typeof variation.stock !== 'undefined' && variation.stock !== null ? variation.stock : 0,
        active: variation.active,
        status: variation.status || product.status,
        images: parseVariationImages(variation.image_url, variation.images),
        parentImages: product.images || [],
        isVariation: true,
        parentId: product.id,
    };
}
