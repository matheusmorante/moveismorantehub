import type Product from '@/pages/types/product.type';
import type { ProductKind } from '@/pages/types/product.type';

export const getProductKind = (
  value?: {
    productKind?: unknown;
    product_kind?: unknown;
    condition?: unknown;
    is_salvado?: unknown;
    stock_origin?: unknown;
    stockOrigins?: unknown;
  } | null
): ProductKind => {
  const kind = value?.productKind ?? value?.product_kind ?? value?.condition;
  if (
    kind === 'salvado' ||
    kind === 'salvados' ||
    value?.is_salvado === true ||
    value?.stock_origin === 'salvados'
  ) {
    return 'salvado';
  }
  if (kind === 'usado' || kind === 'usados' || value?.stock_origin === 'usados') {
    return 'usado';
  }
  return 'normal';
};

export const isNonConventionalProduct = (
  value?: {
    productKind?: unknown;
    product_kind?: unknown;
    condition?: unknown;
    is_salvado?: unknown;
    stock_origin?: unknown;
    stockOrigins?: unknown;
  } | null
): boolean => getProductKind(value) !== 'normal';

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
    productKind: formData.productKind !== undefined ? getProductKind(formData) : undefined,
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
