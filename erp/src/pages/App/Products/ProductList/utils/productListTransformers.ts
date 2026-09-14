import Product from '../../../types/product.type';
import { parseVariationImages } from '@/pages/utils/productService';
import { normalizeVariationSku } from '@/pages/utils/productVariationDefaults';

export interface ProductListRow extends Partial<Product> {
    id: string;
    rowId?: string;
    variationId?: string;
    mergedToVariationId?: string;
    productId?: string;
    sku?: string;
    code?: string;
    description?: string;
    displayName?: string;
    attributes?: readonly unknown[];
    syncUnitPrice?: boolean;
    syncPromoPrice?: boolean;
    syncDescription?: boolean;
    syncWidth?: boolean;
    syncHeight?: boolean;
    syncDepth?: boolean;
    syncWeight?: boolean;
    unitPrice?: number;
    costPrice?: number;
    stock?: number;
    active?: boolean;
    status?: Product['status'];
    images?: string[];
    parentImages?: string[];
    isVariation?: boolean;
    parentId?: string;
    isParent?: boolean;
    allVariations?: readonly ProductListRow[];
    activeVariationsCount?: number;
    totalVariationsCount?: number;
}

interface RawVariationItem {
    id?: string;
    sku?: string | null;
    name?: string;
    attributes?: unknown[];
    syncUnitPrice?: boolean;
    syncPromoPrice?: boolean;
    syncDescription?: boolean;
    syncWidth?: boolean;
    syncHeight?: boolean;
    syncDepth?: boolean;
    syncWeight?: boolean;
    syncCostPrice?: boolean;
    unitPrice?: number;
    costPrice?: number;
    stock?: number;
    active?: boolean;
    status?: Product['status'];
    image_url?: string;
    images?: string[];
    mergedToVariationId?: string;
    merged_to_variation_id?: string;
}

/** Converte produtos paginados e suas variações em linhas próprias para a listagem sem uso de any. */
export function flattenProductsForList(products: readonly Product[]): ProductListRow[] {
    const flattened: ProductListRow[] = [];

    products.forEach((product, productIndex) => {
        const parentSku = product.sku || product.code || String(productIndex + 1).padStart(6, '0');
        const variationsList = (product.variations as unknown as readonly RawVariationItem[] | undefined) || [];
        const hasJsonVariations = Array.isArray(variationsList) && variationsList.length > 0;
        const isParent = Boolean(product.hasVariations) || hasJsonVariations;
        
        const allVariations = hasJsonVariations
            ? variationsList.map((variation, index) => buildVariationListRow(product, variation, index, parentSku))
            : [];

        // Regra do Pai no ERP: Ativo se ao menos uma variação estiver ativa; Desativado se todas estiverem desativadas
        const activeVariationsCount = hasJsonVariations
            ? variationsList.filter((v) => v.active !== false).length
            : (product.active !== false ? 1 : 0);
        const totalVariationsCount = hasJsonVariations ? variationsList.length : 1;
        const parentActive = hasJsonVariations
            ? activeVariationsCount > 0
            : (product.active !== false);

        flattened.push({
            ...product,
            id: product.id || String(productIndex),
            active: parentActive,
            sku: parentSku,
            code: parentSku,
            isParent,
            allVariations,
            activeVariationsCount,
            totalVariationsCount,
        });

        if (hasJsonVariations) {
            variationsList.forEach((variation, index) => {
                flattened.push(buildVariationListRow(product, variation, index, parentSku));
            });
        }
    });

    return flattened;
}

function buildVariationListRow(
    product: Product,
    variation: RawVariationItem,
    index: number,
    parentSku: string,
): ProductListRow {
    const sku = variation.sku && String(variation.sku).trim()
        ? normalizeVariationSku(String(variation.sku).trim())
        : `${parentSku}-${String(index + 1).padStart(2, '0')}`;

    return {
        ...product,
        id: variation.id || `${product.id}-${index}`,
        rowId: `${product.id}:${variation.id || index}`,
        variationId: variation.id,
        mergedToVariationId: variation.mergedToVariationId || variation.merged_to_variation_id || undefined,
        productId: product.id,
        sku,
        code: sku,
        description: variation.name || product.description,
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
