import {
  removeProductVariationTechnicalAttribute,
  syncProductVariationTechnicalAttribute,
} from '../../../../../shared-utils/productVariationTechnicalAttributes';
import type { ProductCharacteristicAttribute } from './productCharacteristicDefinitions';

export const normalizeName = (name: string): string =>
  String(name || '')
    .trim()
    .toLocaleLowerCase('pt-BR');

const parseJson = (value: unknown): unknown => {
  if (typeof value !== 'string' || !value.trim()) return value;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
};

const readStructuredValue = (value: unknown) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return value;
  const structured = value as { value?: unknown; val?: unknown };
  if (Object.prototype.hasOwnProperty.call(structured, 'value')) return structured.value;
  return structured.val;
};

export const toTechnicalValuesMap = (source: unknown): Record<string, unknown> => {
  const parsed = parseJson(source);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};

  return Object.fromEntries(
    Object.entries(parsed).map(([name, value]) => [name, readStructuredValue(value)])
  );
};

export const normalizeValues = (values: Record<string, unknown>) =>
  Object.fromEntries(
    Object.entries(values)
      .filter(([name, value]) => normalizeName(name) && value !== undefined)
      .map(([name, value]) => [normalizeName(name), value])
  );

/** Lê os formatos atuais e legados de características sem perder a preferência showName. */
export const getProductCharacteristicAttributes = (
  rawAttributes: unknown
): ProductCharacteristicAttribute[] => {
  const attributes = parseJson(rawAttributes);

  if (Array.isArray(attributes)) {
    return attributes
      .map((attribute: any) => ({
        name: String(attribute?.name || attribute?.attribute || attribute?.key || '').trim(),
        value: Object.prototype.hasOwnProperty.call(attribute ?? {}, 'value')
          ? attribute.value
          : attribute?.val,
        showName: attribute?.showName !== false,
      }))
      .filter(
        (attribute) => attribute.name && attribute.value !== undefined
      );
  }

  if (attributes && typeof attributes === 'object') {
    return Object.entries(attributes)
      .map(([name, rawValue]) => {
        const value = readStructuredValue(rawValue);
        return {
          name: name.trim(),
          value,
          showName:
            !rawValue || typeof rawValue !== 'object' || Array.isArray(rawValue)
              ? true
              : (rawValue as { showName?: boolean }).showName !== false,
        };
      })
      .filter(
        (attribute) => attribute.name && attribute.value !== undefined
      );
  }

  return [];
};

/** Mirrors ERP's parent color summary derived from variation attributes. */
export const getMobileVariationColorSummary = (variations: readonly unknown[] = []): string => {
  const colors = new Set<string>();
  variations.forEach((variation: any) => {
    getProductCharacteristicAttributes(variation?.attributes).forEach((attribute) => {
      if (attribute.name.toUpperCase() === 'COR' && attribute.value) {
        colors.add(String(attribute.value).toUpperCase());
      }
    });
  });
  return Array.from(colors).join(' / ');
};

/** Atualiza valor sem apagar a opção de ocultar a característica do nome da variação. */
export const upsertProductCharacteristicAttribute = (
  rawAttributes: unknown,
  name: string,
  value: unknown,
  defaultShowName = true
): ProductCharacteristicAttribute[] => {
  const next = getProductCharacteristicAttributes(rawAttributes);
  return syncProductVariationTechnicalAttribute(next, name, value, defaultShowName);
};

export const removeProductCharacteristicAttribute = (
  rawAttributes: unknown,
  name: string
): ProductCharacteristicAttribute[] =>
  removeProductVariationTechnicalAttribute(getProductCharacteristicAttributes(rawAttributes), name);
