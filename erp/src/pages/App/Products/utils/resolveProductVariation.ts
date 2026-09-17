import { Variation } from '../../../types/product.type';

type ProductWithVariations = {
    id?: string;
    sku?: string;
    variationId?: string;
    variations?: Variation[];
};

/** Resolve a variação real sem duplicar a regra de ID/SKU nas ações da lista. */
export const resolveProductVariation = (product: ProductWithVariations): Variation => {
    const variationId = String(product.variationId || '').toLowerCase();
    const sku = String(product.sku || '').trim().toLowerCase();
    const variation = product.variations?.find((candidate) => {
        if (variationId && String(candidate.id || '').toLowerCase() === variationId) return true;
        return Boolean(sku && String(candidate.sku || '').trim().toLowerCase() === sku);
    });

    const fallbackId = product.variationId || (
        product.id?.includes('_') ? product.id.split('_').slice(1).join('_') : product.id
    );
    return variation || { ...product, id: fallbackId } as Variation;
};
