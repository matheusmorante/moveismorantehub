import Product from '../../../types/product.type';

/** Aplica no estado local o resultado otimista da ativação ou desativação. */
export function updateProductActivationState(products: Product[], id: string, active: boolean): Product[] {
    return products.map(product => {
        // 1. Alteração direta no produto pai (quando produto simples sem variações filhas declaradas)
        if (String(product.id) === String(id)) {
            const hasChildren = Array.isArray(product.variations) && product.variations.length > 0;
            if (hasChildren) {
                // Se o pai tem variações, o pai é ativado/desativado em cascata para seus filhos
                const variations = product.variations!.map((variation: any) => ({ ...variation, active }));
                return { ...product, active, variations };
            }
            return { ...product, active };
        }

        // 2. ID composto legado (parentId_sku)
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
                const isParentActive = variations.some((v: any) => v.active !== false);
                return { ...product, active: isParentActive, variations };
            }
        }

        // 3. Variação por UUID dentro da família do produto
        if (product.variations?.some((variation: any) => String(variation.id) === String(id))) {
            const variations = product.variations.map((variation: any) =>
                String(variation.id) === String(id) ? { ...variation, active } : variation,
            );
            const isParentActive = variations.some((v: any) => v.active !== false);
            return { ...product, active: isParentActive, variations };
        }

        return String(product.parentId) === String(id) ? { ...product, active } : product;
    });
}

