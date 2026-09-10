import { MAX_PARENT_PRODUCT_IMAGES, MAX_VARIATION_IMAGES } from '../productImageLimits';
import Product from '../../types/product.type';

export { MAX_PARENT_PRODUCT_IMAGES, MAX_VARIATION_IMAGES };

export const validateProductImageLimits = (product: Partial<Product>): void => {
    if ((product.images || []).length > MAX_PARENT_PRODUCT_IMAGES) {
        throw new Error(`O produto pai pode ter no máximo ${MAX_PARENT_PRODUCT_IMAGES} fotos.`);
    }
    if ((product.variations || []).some(variation => (variation.images || []).length > MAX_VARIATION_IMAGES)) {
        throw new Error(`Cada variação pode vincular no máximo ${MAX_VARIATION_IMAGES} fotos.`);
    }
};

export const parseVariationImages = (rawImageUrl: any, rawImages?: any): string[] => {
    const candidates: any[] = [];
    
    if (rawImages) {
        if (Array.isArray(rawImages)) candidates.push(...rawImages);
        else candidates.push(rawImages);
    }
    
    if (rawImageUrl) {
        if (Array.isArray(rawImageUrl)) candidates.push(...rawImageUrl);
        else candidates.push(rawImageUrl);
    }
    
    const result: string[] = [];
    
    candidates.forEach(item => {
        if (!item) return;
        if (typeof item === 'string') {
            const trimmed = item.trim();
            if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
                try {
                    const parsed = JSON.parse(trimmed);
                    if (Array.isArray(parsed)) {
                        parsed.forEach(p => {
                            const clean = String(p).trim().replace(/^["']|["']$/g, '');
                            if (clean && !result.includes(clean)) result.push(clean);
                        });
                        return;
                    }
                } catch (e) {}
            }
            trimmed.split(',').forEach((s: string) => {
                const clean = s.trim().replace(/^["']|["']$/g, '');
                if (clean && !result.includes(clean)) result.push(clean);
            });
        } else if (typeof item === 'object') {
            const clean = String(item.url || item.image_url || item).trim();
            if (clean && !result.includes(clean)) result.push(clean);
        }
    });

    return result;
};
