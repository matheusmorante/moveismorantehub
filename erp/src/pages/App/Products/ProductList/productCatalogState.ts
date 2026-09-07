import Product from '../../../types/product.type';
import { normalizeVariationSku } from '@/pages/utils/productVariationDefaults';

/** Aplica no estado local o resultado otimista de publicar ou ocultar no Catálogo. */
export function updateProductCatalogState(products: Product[], id: string, status: string): Product[] {
    const [parentId, ...skuParts] = id.split('_');
    const targetSku = skuParts.join('_');
    const isCompoundId = skuParts.length > 0;

    return products.map(product => {
        if (isCompoundId && String(product.id) === String(parentId) && product.variations) {
            const variations = product.variations.map((variation: any, index: number) => {
                const rawSku = variation.sku || '';
                const generatedSku = `${product.sku || product.code || ''}-${String(index + 1).padStart(2, '0')}`;
                const matches = String(variation.id) === targetSku ||
                    String(index) === targetSku ||
                    (rawSku && String(rawSku) === targetSku) ||
                    generatedSku === targetSku ||
                    normalizeVariationSku(rawSku) === normalizeVariationSku(targetSku) ||
                    normalizeVariationSku(generatedSku) === normalizeVariationSku(targetSku);
                return matches ? { ...variation, status } : variation;
            });
            return { ...product, variations };
        }

        if (product.variations?.some((variation: any) => String(variation.id) === String(id) || String(variation.sku) === String(id))) {
            const variations = product.variations.map((variation: any) =>
                String(variation.id) === String(id) || String(variation.sku) === String(id)
                    ? { ...variation, status }
                    : variation,
            );
            return { ...product, variations };
        }

        if (String(product.id) === String(id)) {
            const variations = product.variations?.map((variation: any) => ({ ...variation, status }));
            return { ...product, status, variations: variations || product.variations };
        }

        return String(product.parentId) === String(id) ? { ...product, status } : product;
    });
}
