import type { Product, Variation } from '@/pages/types/product.type';
import { MAX_VARIATION_IMAGES } from '@/pages/utils/productImageLimits';
import {
  buildProductVariationName,
  computeVariationName,
  getVariationNameAttributes,
  isVariationNamePlaceholderSuffix,
} from '@/pages/utils/productVariationDefaults';
import { generateVariationSku } from '@/pages/utils/productService';
import { toTitleCase } from '@/pages/utils/textUtils';
import { resolveVariationDimensions } from '../../domain/variationRegistrationRules';

export function prepareFinalVariation(
  formData: Variation,
  parentProduct: Product,
  isSingleVariation: boolean,
  isDraft: boolean,
  allParentImages: string[]
): Variation {
  const { requiredTechnicalFields: _requiredTechnicalFields, ...persistableFormData } = formData;
  const cleanAttributes = (Array.isArray(formData.attributes) ? formData.attributes : []).map(
    (attr) => ({
      ...attr,
      name: toTitleCase(attr.name),
      value: toTitleCase(attr.value),
    })
  );

  const parentPrefix = (parentProduct.name || parentProduct.description || '').trim();
  const nameAttributes = getVariationNameAttributes(cleanAttributes);
  const generatedName = computeVariationName(parentPrefix, nameAttributes);
  let variationName = (formData.name || '').trim();
  const nameSuffix =
    parentPrefix && variationName.toLowerCase().startsWith(parentPrefix.toLowerCase())
      ? variationName.slice(parentPrefix.length).replace(/^[\s\-_:]+/, '')
      : variationName;

  if (!variationName || isVariationNamePlaceholderSuffix(nameSuffix)) {
    variationName = generatedName;
  }
  if (variationName.toLocaleLowerCase() === parentPrefix.toLocaleLowerCase()) {
    variationName = generatedName;
  }
  if (parentPrefix) {
    if (!variationName.toLowerCase().startsWith(parentPrefix.toLowerCase())) {
      variationName = buildProductVariationName(parentPrefix, variationName);
    }
  }

  const resolvedVariationImages = isSingleVariation
    ? [...(allParentImages.length > 0 ? allParentImages : parentProduct.images || [])]
    : (formData.images || []).slice(0, MAX_VARIATION_IMAGES);

  const finalVariation: Variation = {
    ...persistableFormData,
    images: resolvedVariationImages,
    ...(isSingleVariation
      ? {
          syncUnitPrice: true,
          syncPromoPrice: true,
          syncDescription: true,
          syncCostPrice: true,
          syncCondition: true,
          syncFiscal: true,
          syncNcm: true,
          syncWithParent: true,
          syncDimensions: true,
          syncWidth: true,
          syncHeight: true,
          syncDepth: true,
          syncWeight: true,
          syncIpi: true,
          syncFreight: true,
          images: resolvedVariationImages,
          unitPrice: parentProduct.unitPrice || 0,
          promoPrice: parentProduct.promoPrice || 0,
          costPrice: parentProduct.costPrice || 0,
          condition: parentProduct.condition || 'novo',
          description: parentProduct.description || '',
          fiscal: parentProduct.fiscal ? { ...parentProduct.fiscal } : undefined,
          width: parentProduct.width || 0,
          height: parentProduct.height || 0,
          depth: parentProduct.depth || 0,
          weight: parentProduct.weight || 0,
          ipiPercent: parentProduct.ipiPercent || 0,
          ipiType: parentProduct.ipiType || 'percentage',
          freightCost: parentProduct.freightCost || 0,
          freightType: parentProduct.freightType || 'fixed',
          finalPurchasePrice: parentProduct.finalPurchasePrice || 0,
        }
      : {}),
    attributes: cleanAttributes,
    name: toTitleCase(variationName),
    title: toTitleCase(variationName),
    marketplaceTitle: toTitleCase(variationName),
  };

  Object.assign(finalVariation, resolveVariationDimensions(parentProduct, finalVariation));

  if (finalVariation.syncDescription) {
    finalVariation.description = parentProduct.description || '';
  }
  if (finalVariation.syncWeight) {
    finalVariation.weight = parentProduct.weight || 0;
  }
  if (finalVariation.syncUnitPrice) {
    finalVariation.unitPrice = parentProduct.unitPrice || 0;
    if (finalVariation.syncPromoPrice !== false) {
      finalVariation.promoPrice = parentProduct.promoPrice || 0;
    }
  }
  if (finalVariation.syncCostPrice) {
    finalVariation.costPrice = parentProduct.costPrice || 0;
  }

  finalVariation.status = finalVariation.status === 'published' ? 'published' : 'hidden';
  finalVariation.active = isDraft
    ? false
    : formData.status === 'draft'
      ? parentProduct.active !== false
      : formData.active;
  finalVariation.sku ||= generateVariationSku(
    parentProduct.code || '000000',
    parentProduct.variations || []
  );

  return finalVariation;
}
