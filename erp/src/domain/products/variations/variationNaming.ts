import Product, { Variation } from '@/pages/types/product.type';
import { toTitleCase } from '@/pages/utils/textUtils';
import {
  getVariationAttributePairs,
  normalizeAttributePart,
} from './variationAttributes';

export const normalizeNameTokens = (value: unknown): string[] =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .match(/[a-z0-9]+/g) || [];

export const containsNamePhrase = (name: string, phrase: string): boolean => {
  const nameTokens = normalizeNameTokens(name);
  const phraseTokens = normalizeNameTokens(phrase);
  if (phraseTokens.length === 0) return true;

  return nameTokens.some((_, start) =>
    phraseTokens.every((token, offset) => nameTokens[start + offset] === token)
  );
};

export const getVariationAttributeValuesInNameOrder = (
  attributes: Variation['attributes'] | Record<string, any> | string = []
): string[] =>
  getVariationAttributePairs({ attributes })
    .filter(({ showName }) => showName)
    .map(({ value }) => String(value).trim());

/** Usa somente atributos explicitamente incluídos no complemento do nome. */
export const getVariationNameAttributes = (
  attributes: Variation['attributes'] = []
): Variation['attributes'] => attributes;

export const buildProductVariationName = (parentName: string, suffix: string): string => {
  const parent = parentName.trim();
  const variationSuffix = suffix.trim();
  if (!parent) return variationSuffix;
  if (!variationSuffix) return parent;
  return `${parent} ${variationSuffix}`;
};

export const normalizeProductVariationName = (
  parentName: string,
  variationName: string
): string => {
  const parent = parentName.trim();
  const name = variationName.trim();
  if (!parent || name.slice(0, parent.length).toLowerCase() !== parent.toLowerCase()) return name;

  const suffix = name.slice(parent.length);
  if (!/^\s*[-–—]\s*/u.test(suffix)) return name;
  return `${name.slice(0, parent.length)} ${suffix.replace(/^\s*[-–—]\s*/u, '')}`.trim();
};

export const isVariationNamePlaceholderSuffix = (suffix: string): boolean =>
  ['produto', 'variação', 'nova variação'].includes(suffix.trim().toLowerCase());

export const getLegacyUnstructuredAttributeText = (attributes: unknown): string => {
  if (typeof attributes !== 'string' || !attributes.trim()) return '';
  try {
    JSON.parse(attributes);
    return '';
  } catch {
    return toTitleCase(attributes.trim());
  }
};

export const computeVariationName = (
  parentName: string,
  attributes:
    | Array<{ name?: string; value?: string; showName?: boolean }>
    | Record<string, any>
    | string
): string => {
  const cleanParent = parentName ? toTitleCase(parentName.trim()) : '';
  const orderedValues = getVariationAttributeValuesInNameOrder(attributes).map((v) =>
    toTitleCase(v)
  );
  const attrValuesStr =
    orderedValues.length > 0
      ? orderedValues.join(' ')
      : getLegacyUnstructuredAttributeText(attributes);

  const fullName = buildProductVariationName(cleanParent, attrValuesStr);
  return toTitleCase(fullName);
};

/**
 * Nome usado ao selecionar um item em qualquer formulário do ERP.
 * A variação já contém o nome do produto pai e seus atributos, então não deve
 * receber o nome do pai novamente.
 */
export const getSelectedProductDisplayName = (
  product?: Partial<Product> | any,
  variation?: Partial<Variation> | any
): string => {
  const parentName = String(product?.name || product?.title || product?.description || '').trim();
  const variationName = normalizeProductVariationName(
    parentName,
    String(variation?.displayName || variation?.name || '')
  );
  if (!variation) return toTitleCase(parentName);

  const attributes = variation.attributes ?? [];
  const nameAttributes = getVariationNameAttributes(attributes);
  const visibleAttributeValues = getVariationAttributeValuesInNameOrder(nameAttributes);
  if (visibleAttributeValues.length === 0) {
    return toTitleCase(variationName || parentName);
  }

  const includesParent = !parentName || containsNamePhrase(variationName, parentName);
  const includesAttributes = visibleAttributeValues.every((value) =>
    containsNamePhrase(variationName, value)
  );
  if (variationName && includesParent && includesAttributes) {
    return toTitleCase(variationName);
  }

  const completeVariationName = computeVariationName(parentName, nameAttributes);
  if (completeVariationName) return completeVariationName;

  return toTitleCase(variationName || parentName);
};
