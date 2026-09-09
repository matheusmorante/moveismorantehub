import Product from '../../../types/product.type';
/** Aplica no estado local o resultado otimista de publicar ou ocultar no Catálogo. */
export function updateProductCatalogState(products: Product[], id: string, status: Product['status']): Product[] {
    return products.map(product => {
        if (product.variations?.some((variation: any) => String(variation.id) === String(id))) {
            const variations = product.variations.map((variation: any) =>
                String(variation.id) === String(id)
                    ? { ...variation, status }
                    : variation,
            );
            return { ...product, status: variations.length === 1 ? status : product.status, variations };
        }

        if (String(product.id) === String(id)) {
            const variations = product.variations?.map((variation: any) => ({ ...variation, status }));
            return { ...product, status, variations: variations || product.variations };
        }

        return String(product.parentId) === String(id) ? { ...product, status } : product;
    });
}
