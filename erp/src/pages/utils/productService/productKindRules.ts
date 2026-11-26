import type Product from '@/pages/types/product.type';
import type { ProductKind } from '@/pages/types/product.type';
import {
  getProductKind as getSharedProductKind,
  isSalvadoStockOrigin,
  type ProductKindCandidate,
  type ProductStockOriginCandidate,
} from '../../../../../shared-utils/productStockOrigin';
import { MAX_VARIATION_IMAGES } from './productImageLimits';

export const getProductKind = (value?: ProductKindCandidate | null): ProductKind =>
  getSharedProductKind(value);

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

export const isSalvadoProduct = (
  value?: ProductStockOriginCandidate | null
): boolean => isSalvadoStockOrigin(value);

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
  const isSalvado = isSalvadoProduct(formData);
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
      ...(isSalvado ? { stock: null as unknown as Product['stock'] } : {}),
      width: parseTech(['Largura'], formData.width),
      height: parseTech(['Altura'], formData.height),
      depth: parseTech(['Profundidade total', 'Profundidade'], formData.depth),
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
          ...(isSalvado ? { stock: null as unknown as typeof variation.stock } : {}),
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
