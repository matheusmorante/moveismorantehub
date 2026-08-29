import Product, { Variation } from '../types/product.type';

export const isDefaultVariation = (_variation: Variation, index: number) => index === 0;

export const hasVariationAttribute = (variation?: Variation) => Boolean(
    variation?.attributes?.some((attribute) => attribute.name && attribute.value),
);

export const hasMissingRequiredAttributes = (variations: Variation[] = []) => variations
    .some((variation, index) => index > 0 && !hasVariationAttribute(variation));

export const ensureDefaultVariation = <T extends Partial<Product>>(product: T): T => {
    if (product.itemType !== 'product') return product;
    if (product.variations && product.variations.length > 0) return { ...product, hasVariations: true };

    const name = product.name || product.title || product.description || 'Produto';
    const variation: Variation = {
        id: crypto.randomUUID(),
        sku: '',
        name,
        stock: Number(product.stock || 0),
        unitPrice: Number(product.unitPrice || 0),
        costPrice: Number(product.costPrice || 0),
        active: product.active !== false,
        attributes: [],
        images: [...(product.images || [])],
        syncUnitPrice: true,
        syncCostPrice: true,
        syncPromoPrice: true,
        syncDescription: true,
        syncWidth: true,
        syncHeight: true,
        syncDepth: true,
    };
    return { ...product, hasVariations: true, variations: [variation] };
};
