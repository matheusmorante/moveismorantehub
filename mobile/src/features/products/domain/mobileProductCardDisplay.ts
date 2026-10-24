import { toTitleCase } from '../../../../../shared-utils/productText';
import { containsProductVariationNamePhrase } from './productVariationName';

/**
 * Normaliza partes de nomes para comparação textual no card mobile.
 */
export const normalizeVariationNamePart = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

/**
 * Extrai a cor técnica das propriedades de um produto ou variação.
 */
export const getTechnicalColor = (technicalValues: any): string | undefined => {
  if (!technicalValues || typeof technicalValues !== 'object') return undefined;
  const values =
    technicalValues.technicalValues || technicalValues.technical_values || technicalValues;
  const entries = Array.isArray(values)
    ? values.map((entry: any) => [entry?.name || entry?.key, entry])
    : Object.entries(values);
  const colorEntry = entries.find(
    ([name]) => normalizeVariationNamePart(String(name || '')) === 'cor'
  );
  if (!colorEntry) return undefined;
  const rawValue = colorEntry[1];
  const structuredValue =
    rawValue && typeof rawValue === 'object' ? (rawValue as Record<string, any>) : null;
  const color = structuredValue ? (structuredValue.value ?? structuredValue.val) : rawValue;
  return color === null || color === undefined || String(color).trim() === ''
    ? undefined
    : String(color).trim();
};

/**
 * Obtém os valores de características de uma variação formatados para exibição.
 */
export const getVariationAttributeValues = (product: any, variation: any): string[] => {
  let attributes = variation?.attributes;
  if (typeof attributes === 'string') {
    try {
      attributes = JSON.parse(attributes);
    } catch {
      return [];
    }
  }

  const pairs: { name: any; value: any; showName: boolean }[] = Array.isArray(attributes)
    ? attributes.map((attribute: any) => ({
        name: attribute?.name || attribute?.attribute || attribute?.key,
        value: attribute?.value || attribute?.val,
        showName: attribute?.showName !== false,
      }))
    : attributes && typeof attributes === 'object'
      ? Object.entries(attributes).map(([name, rawValue]) => {
          const structured =
            rawValue && typeof rawValue === 'object' ? (rawValue as Record<string, any>) : null;
          return {
            name,
            value: structured?.value ?? structured?.val ?? rawValue,
            showName: structured?.showName !== false,
          };
        })
      : [];

  const hasVariationColor = pairs.some(
    ({ name }) => normalizeVariationNamePart(String(name || '')) === 'cor'
  );
  if (!hasVariationColor) {
    const color =
      getTechnicalColor(variation?.technicalValues || variation?.technical_values) ||
      getTechnicalColor(
        product?.technicalValues ||
          product?.technical_values ||
          product?.technicalSpecs ||
          product?.technical_specs
      );
    if (color) pairs.push({ name: 'Cor', value: color, showName: true });
  }

  return pairs
    .filter(({ name, value, showName }) => showName && name && value)
    .map(({ value }) => String(value).trim())
    .filter(Boolean);
};

/**
 * Formata o título de exibição de um card para produtos com variação única.
 */
export const getSingleVariationDisplayName = (product: any, variation: any): string => {
  const parentName = String(product?.name || product?.title || product?.description || '').trim();
  const variationName = String(variation?.displayName || variation?.name || '').trim();
  const attributeValues = getVariationAttributeValues(product, variation);

  if (attributeValues.length === 0) return toTitleCase(variationName || parentName);

  const includesParent =
    !parentName || containsProductVariationNamePhrase(variationName, parentName);
  const includesAttributes = attributeValues.every((value) =>
    containsProductVariationNamePhrase(variationName, value)
  );
  if (variationName && includesParent && includesAttributes) return toTitleCase(variationName);

  return toTitleCase([parentName, attributeValues.join(' ')].filter(Boolean).join(' - '));
};
