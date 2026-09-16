import Product from '../../types/product.type';
import { toTitleCase } from '../textUtils';

export const formatProductTextData = (product: Product): Product => {
    if (product.name) product.name = toTitleCase(product.name);
    if (product.title) product.title = toTitleCase(product.title);
    if (product.marketplaceTitle) product.marketplaceTitle = toTitleCase(product.marketplaceTitle);
    if (product.brand) product.brand = toTitleCase(product.brand);
    if (product.line) product.line = toTitleCase(product.line);
    if (product.material) product.material = toTitleCase(product.material);
    if (product.colors) product.colors = toTitleCase(product.colors);
    if (product.environment) product.environment = toTitleCase(product.environment);

    if (Array.isArray(product.variations)) {
        product.variations = product.variations.map(v => {
            const cleanAttrs = (v.attributes || []).map((attr: any) => ({
                ...attr,
                name: toTitleCase(attr.name),
                value: toTitleCase(attr.value),
            }));
            const varName = v.name ? toTitleCase(v.name) : (product.name ? toTitleCase(product.name) : '');
            return {
                ...v,
                name: varName,
                ...(v.title ? { title: toTitleCase(v.title) } : {}),
                ...(v.marketplaceTitle ? { marketplaceTitle: toTitleCase(v.marketplaceTitle) } : {}),
                attributes: cleanAttrs,
            };
        });
    }

    return product;
};
