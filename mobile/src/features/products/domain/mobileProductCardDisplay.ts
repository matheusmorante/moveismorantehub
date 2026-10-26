import { toTitleCase } from '../../../../../shared-utils/productText';
import { parseProductVariationAttributes } from '../../../../../shared-utils/productVariationAttributes';
import { normalizeProductVariationName } from '../../../../../shared-utils/productVariationNameValidation';
import {
  getCompleteVariationName,
  getVariationNameAttributeValues,
} from '../../../../../shared-utils/productVariationNameValidation';
import { containsProductVariationNamePhrase } from './productVariationName';
import { getMobileProductRootCompositionItems } from './mobileProductCompositionItems';

/**
 * Formata o título de exibição de um card para produtos com variação única.
 */
export const getSingleVariationDisplayName = (product: any, variation: any): string => {
  const parentName = String(product?.name || product?.title || product?.description || '').trim();
  const variationName = normalizeProductVariationName(
    parentName,
    String(variation?.displayName || variation?.name || '')
  );
  const attributes = parseProductVariationAttributes(variation?.attributes, {
    preserveStructuredShowName: true,
  });
  const attributeValues = getVariationNameAttributeValues(attributes);

  if (attributeValues.length === 0) return toTitleCase(variationName || parentName);

  const includesParent =
    !parentName || containsProductVariationNamePhrase(variationName, parentName);
  const includesAttributes = attributeValues.every((value) =>
    containsProductVariationNamePhrase(variationName, value)
  );
  if (variationName && includesParent && includesAttributes) return toTitleCase(variationName);

  return toTitleCase(
    getCompleteVariationName({ attributes }, parentName) || variationName || parentName
  );
};

/** Mirrors the ERP child-row label, while preserving the mobile fallback for unnamed records. */
export const getMobileProductVariationCardName = (
  product: any,
  variation: any,
  index: number
): string =>
  toTitleCase(variation?.displayName || variation?.name || '') ||
  getSingleVariationDisplayName(product, variation) ||
  `Variação #${index + 1}`;

/** Mirrors the ERP card subtitle for products whose root composition is shown. */
export const getMobileProductCompositionCardItems = (product: any): string[] => {
  const isComposition =
    product?.itemType === 'composition' ||
    product?.item_type === 'composition' ||
    product?.isCombo === true ||
    product?.is_combo === true;
  if (!isComposition) return [];

  return getMobileProductRootCompositionItems(product).map((item) => {
    const description = typeof item?.description === 'string' ? item.description : '';
    const displayName = description.split(' - ')[0].trim();
    return displayName || 'Item sem nome';
  });
};
