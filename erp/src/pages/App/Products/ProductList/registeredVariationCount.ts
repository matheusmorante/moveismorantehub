const VARIATION_SKU_PATTERN = /^\d{6}-\d{2}$/;

type ProductWithVariations = {
    product_variations?: Array<{ sku?: string | null }> | null;
};

const hasVariationSku = (variation: { sku?: string | null }) =>
    VARIATION_SKU_PATTERN.test(String(variation.sku || '').trim());

export const getRegisteredVariationCount = (products: ProductWithVariations[]) =>
    products.reduce((total, product) => {
        const variations = Array.isArray(product.product_variations) ? product.product_variations : [];
        const variationCount = variations.filter(hasVariationSku).length;

        return total + variationCount;
    }, 0);
