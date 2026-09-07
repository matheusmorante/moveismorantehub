import Product from '../../../types/product.type';

/** Aplica no estado local o resultado otimista da ativação ou desativação. */
export function updateProductActivationState(products: Product[], id: string, active: boolean): Product[] {
    return products.map(product => {
        if (String(product.id) === String(id)) {
            const variations = product.variations?.map((variation: any) => ({ ...variation, active }));
            return { ...product, active, variations: variations || product.variations };
        }

        if (id.includes('_')) {
            const [parentId, ...skuParts] = id.split('_');
            const targetSku = skuParts.join('_');
            if (String(product.id) === String(parentId) && product.variations) {
                const variations = product.variations.map((variation: any, index: number) => {
                    const variationSku = variation.sku || index;
                    return String(variationSku) === String(targetSku) || String(variation.id) === String(targetSku)
                        ? { ...variation, active }
                        : variation;
                });
                return { ...product, variations };
            }
        }

        if (product.variations?.some((variation: any) => String(variation.id) === String(id))) {
            const variations = product.variations.map((variation: any) =>
                String(variation.id) === String(id) ? { ...variation, active } : variation,
            );
            return { ...product, variations };
        }

        return String(product.parentId) === String(id) ? { ...product, active } : product;
    });
}
