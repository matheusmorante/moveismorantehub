import type Product from '@/pages/types/product.type';
import type { ProductKind } from '@/pages/types/product.type';

export const getProductKind = (value?: { productKind?: unknown } | null): ProductKind =>
    value?.productKind === 'salvado' ? 'salvado' : 'normal';

export const isSalvadoProduct = (value?: { productKind?: unknown } | null): boolean =>
    getProductKind(value) === 'salvado';

export const normalizeProductForSave = (
    formData: Partial<Product>,
    options: {
        isDraft: boolean;
        isCompletingDraft: boolean;
        catalogStatus: NonNullable<Product['status']>;
        name: string;
    }
): Product => {
    const isSalvado = isSalvadoProduct(formData);
    const forceInactive = options.isDraft || isSalvado;

    return {
        ...formData,
        name: options.name || formData.name || 'Produto',
        productKind: getProductKind(formData),
        isDraft: options.isDraft,
        active: forceInactive ? false : (options.isCompletingDraft ? true : formData.active !== false),
        status: options.catalogStatus,
        variations: (formData.variations || []).map(variation => ({
            ...variation,
            active: forceInactive ? false : (options.isCompletingDraft ? true : variation.active),
            status: options.isDraft
                ? 'draft'
                : (options.catalogStatus === 'published' ? (variation.status || 'published') : 'hidden')
        }))
    } as Product;
};
