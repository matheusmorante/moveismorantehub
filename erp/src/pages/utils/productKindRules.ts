import type Product from '@/pages/types/product.type';
import type { ProductKind } from '@/pages/types/product.type';

export const getProductKind = (value?: { productKind?: unknown } | null): ProductKind => {
  if (value?.productKind === 'salvado') return 'salvado';
  if (value?.productKind === 'usado') return 'usado';
  return 'normal';
};

export const isNonConventionalProduct = (value?: { productKind?: unknown } | null): boolean =>
  getProductKind(value) !== 'normal';

export const normalizeProductForSave = (
  formData: Partial<Product>,
  options: {
    isDraft: boolean;
    isCompletingDraft: boolean;
    catalogStatus: NonNullable<Product['status']>;
    name: string;
  }
): Product => {
  const isNonConventional = isNonConventionalProduct(formData);
  const forceInactive = options.isDraft || isNonConventional;

  const parseTech = (names: string[], currentVal: unknown) => {
    if (typeof currentVal === 'number' && currentVal > 0) return currentVal;
    const tv = formData.technicalValues || {};
    for (const name of names) {
      if (tv[name]) {
        const num = Number(String(tv[name]).replace(',', '.'));
        if (!isNaN(num) && num > 0) return num;
      }
    }
    return typeof currentVal === 'number' ? currentVal : 0;
  };

  return {
    ...formData,
    width: parseTech(['Largura'], formData.width),
    height: parseTech(['Altura'], formData.height),
    depth: parseTech(['Profundidade', 'Comprimento'], formData.depth),
    weight: parseTech(['Peso'], formData.weight),
    name: options.name || formData.name || 'Produto',
    productKind: formData.productKind ? getProductKind(formData) : undefined,
    isDraft: options.isDraft,
    active: forceInactive ? false : options.isCompletingDraft ? true : formData.active !== false,
    status: options.catalogStatus,
    variations: (formData.variations || []).map((variation) => ({
      ...variation,
      active: forceInactive ? false : options.isCompletingDraft ? true : variation.active,
      status: options.isDraft
        ? variation.status || 'draft'
        : options.catalogStatus === 'published'
          ? variation.status === 'draft' ? 'hidden' : variation.status || 'published'
          : 'hidden',
    })),
  } as Product;
};
