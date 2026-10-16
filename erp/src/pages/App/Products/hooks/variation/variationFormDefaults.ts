import type { Product, Variation } from '@/pages/types/product.type';
import { MAX_VARIATION_IMAGES } from '@/pages/utils/productImageLimits';
import {
  buildProductVariationName,
  computeVariationName,
  getVariationAttributeValuesInNameOrder,
  getVariationNameAttributes,
} from '@/pages/utils/productVariationDefaults';
import { generateVariationSku, parseVariationImages } from '@/pages/utils/productService';
import { toTitleCase } from '@/pages/utils/textUtils';

export function computeDefaultVariationName(
  parentProduct: Product,
  attributes: Variation['attributes'] = []
): string {
  const nameAttributes = getVariationNameAttributes(attributes);
  return computeVariationName(
    parentProduct.name || parentProduct.description || '',
    nameAttributes
  );
}

export function computeDefaultVariationTitle(
  parentProduct: Product,
  attributes: Variation['attributes'] = []
): string {
  const parentTitle = (
    parentProduct.title ||
    parentProduct.marketplaceTitle ||
    parentProduct.name ||
    parentProduct.description ||
    ''
  ).trim();
  const nameAttributes = getVariationNameAttributes(attributes);
  const attributeValues = getVariationAttributeValuesInNameOrder(nameAttributes);
  if (attributeValues.length > 0) {
    return toTitleCase(buildProductVariationName(parentTitle, attributeValues.join(' ')));
  }
  return toTitleCase(parentTitle);
}

export function buildInitialVariationFormData(
  parentProduct: Product,
  variation: Variation | null,
  isDraft: boolean,
  isSingleVariation: boolean,
  parentImages: string[]
): {
  formData: Variation;
  discountFixed: string;
  discountPercent: string;
} {
  const defaultImages = isSingleVariation
    ? (parentImages.length > 0 ? parentImages : parentProduct.images || []).slice(
        0,
        MAX_VARIATION_IMAGES
      )
    : [];

  if (variation) {
    const existingImages = parseVariationImages(
      (variation as any).image_url,
      variation.images
    );
    const resolvedImages =
      existingImages.length > 0
        ? existingImages.slice(0, MAX_VARIATION_IMAGES)
        : defaultImages;

    const formData: Variation = {
      ...variation,
      status: variation.status === 'draft' ? 'hidden' : variation.status || 'hidden',
      ...(isDraft ? { active: false } : {}),
      title: variation.title || variation.marketplaceTitle || '',
      images: resolvedImages,
      syncUnitPrice: isSingleVariation || (variation.syncUnitPrice ?? true),
      syncPromoPrice: isSingleVariation || (variation.syncPromoPrice ?? true),
      syncDescription: isSingleVariation || (variation.syncDescription ?? true),
      syncCostPrice: isSingleVariation || (variation.syncCostPrice ?? true),
      syncCondition: isSingleVariation || (variation.syncCondition ?? true),
      syncFiscal: isSingleVariation || (variation.syncFiscal ?? true),
      syncWithParent: isSingleVariation || (variation.syncWithParent ?? true),
      syncDimensions: isSingleVariation || (variation.syncDimensions ?? true),
      syncWidth: isSingleVariation || (variation.syncWidth ?? true),
      syncHeight: isSingleVariation || (variation.syncHeight ?? true),
      syncDepth: isSingleVariation || (variation.syncDepth ?? true),
      syncWeight: isSingleVariation || (variation.syncWeight ?? true),
      syncIpi: isSingleVariation || (variation.syncIpi ?? true),
      syncFreight: isSingleVariation || (variation.syncFreight ?? true),
    };

    const orig = Number(
      variation.syncUnitPrice ? parentProduct.unitPrice : variation.unitPrice || 0
    );
    const promo = Number(
      variation.syncUnitPrice ? parentProduct.promoPrice : variation.promoPrice || 0
    );

    let discountFixed = '';
    let discountPercent = '';
    if (orig > 0 && promo > 0 && promo < orig) {
      const fixed = orig - promo;
      const pct = (fixed / orig) * 100;
      discountFixed = fixed.toFixed(2);
      discountPercent = pct.toFixed(1);
    }

    return { formData, discountFixed, discountPercent };
  }

  const parentCode = parentProduct.code || '000000';
  const formData: Variation = {
    id: crypto.randomUUID(),
    sku: generateVariationSku(parentCode, parentProduct.variations || []),
    name: computeDefaultVariationName(parentProduct, []),
    title: computeDefaultVariationTitle(parentProduct, []),
    marketplaceTitle: computeDefaultVariationTitle(parentProduct, []),
    stock: 0,
    unitPrice: parentProduct.unitPrice || 0,
    costPrice: parentProduct.costPrice || 0,
    active: false,
    status: 'hidden',
    attributes: [],
    images: defaultImages,
    syncUnitPrice: true,
    syncDescription: true,
    syncCostPrice: true,
    syncFiscal: true,
    syncWidth: true,
    syncHeight: true,
    syncDepth: true,
    syncWeight: true,
    fiscal: {
      ncm: parentProduct.fiscal?.ncm || '',
      cest: parentProduct.fiscal?.cest || '',
      origem: parentProduct.fiscal?.origem || '0',
      cst: parentProduct.fiscal?.cst || '',
      cfop: parentProduct.fiscal?.cfop || '',
      pisCst: parentProduct.fiscal?.pisCst || '',
      cofinsCst: parentProduct.fiscal?.cofinsCst || '',
      icmsPercent: parentProduct.fiscal?.icmsPercent || 0,
      ncmDescription: parentProduct.fiscal?.ncmDescription || '',
    },
  };

  return { formData, discountFixed: '', discountPercent: '' };
}

export function calculateEffectivePurchaseCost(
  cost: number,
  ipi: number,
  freight: number,
  freightType: 'fixed' | 'percentage' | string
): number {
  let finalCost = cost + cost * (ipi / 100);
  if (freightType === 'fixed') {
    finalCost += freight;
  } else {
    finalCost += cost * (freight / 100);
  }
  return Number(finalCost.toFixed(2));
}
