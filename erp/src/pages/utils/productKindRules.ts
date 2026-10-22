import type Product from '@/pages/types/product.type';
import type { ProductKind } from '@/pages/types/product.type';
import { MAX_VARIATION_IMAGES } from './productImageLimits';

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

    const effectiveName = options.name || formData.name || 'Produto';
    return {
      ...formData,
      width: parseTech(['Largura'], formData.width),
      height: parseTech(['Altura'], formData.height),
      depth: parseTech(['Profundidade', 'Comprimento'], formData.depth),
      weight: parseTech(['Peso'], formData.weight),
      name: effectiveName,
      title: effectiveName,
      marketplaceTitle: effectiveName,
      productKind: formData.productKind !== undefined ? getProductKind(formData) : undefined,
      hasVariations: options.isDraft
        ? Boolean(formData.hasVariations)
        : (formData.variations?.length || 0) > 1,
      isDraft: options.isDraft,
      active: forceInactive ? false : options.isCompletingDraft ? true : formData.active !== false,
      status: options.catalogStatus,
      variations: (formData.variations || []).map((variation) => {
        const varName = variation.name || effectiveName;
        const isSingleVariation = formData.variations?.length === 1;
        const candidateImages = isSingleVariation ? formData.images || [] : variation.images || [];
        const cappedImages = isSingleVariation
          ? [...candidateImages]
          : candidateImages.slice(0, MAX_VARIATION_IMAGES);

        return {
          ...variation,
          images: cappedImages,
          name: varName,
          title: varName,
          marketplaceTitle: varName,
          active: forceInactive ? false : options.isCompletingDraft ? true : variation.active,
          status: options.isDraft
            ? variation.status || 'draft'
            : options.catalogStatus === 'published'
              ? variation.status === 'draft' ? 'hidden' : variation.status || 'published'
              : 'hidden',
        };
      }),
    } as Product;
  };
