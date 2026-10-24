import type { Variation } from '../../../pages/types/product.type';

export interface IncompleteAttributeInfo {
  index: number;
  name: string;
  missingReason: 'missing_name' | 'missing_value' | 'empty_attribute';
}

export type AttributePair = {
  name: string;
  value: string;
  showName: boolean;
};

export const normalizeAttributePart = (value: unknown): string =>
  String(value || '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLocaleLowerCase();

/**
 * Retorna lista de atributos que estão incompletos em uma variação (sem nome ou sem valor).
 */
export const getIncompleteVariationAttributes = (
  variation?: Variation | any
): IncompleteAttributeInfo[] => {
  if (!variation) return [];

  let rawAttributes = variation.attributes;
  if (typeof rawAttributes === 'string' && rawAttributes.trim()) {
    try {
      rawAttributes = JSON.parse(rawAttributes);
    } catch {
      return [];
    }
  }

  if (Array.isArray(rawAttributes)) {
    const result: IncompleteAttributeInfo[] = [];
    rawAttributes.forEach((attr: any, index: number) => {
      if (!attr) {
        result.push({ index, name: `Atributo #${index + 1}`, missingReason: 'empty_attribute' });
        return;
      }
      const name = String(attr.name || attr.attribute || attr.key || '').trim();
      const val = String(attr.value || attr.val || '').trim();

      if (!name) {
        result.push({ index, name: `Atributo #${index + 1}`, missingReason: 'missing_name' });
      } else if (!val) {
        result.push({ index, name, missingReason: 'missing_value' });
      }
    });
    return result;
  }

  if (typeof rawAttributes === 'object' && rawAttributes !== null) {
    const result: IncompleteAttributeInfo[] = [];
    Object.entries(rawAttributes).forEach(([k, v], index) => {
      const name = String(k || '').trim();
      const val = String(v || '').trim();
      if (!name) {
        result.push({ index, name: `Atributo #${index + 1}`, missingReason: 'missing_name' });
      } else if (!val) {
        result.push({ index, name, missingReason: 'missing_value' });
      }
    });
    return result;
  }

  return [];
};

/**
 * Valida se uma variação possui ao menos um atributo E que TODOS os atributos adicionados
 * possuam tanto nome quanto valor devidamente preenchidos.
 */
export const hasVariationAttribute = (variation?: Variation | any): boolean => {
  if (!variation) return false;

  // Se já possui Informações Técnicas com valores definidos
  if (variation.technicalValues && typeof variation.technicalValues === 'object') {
    const hasDefinedTechValue = Object.values(variation.technicalValues).some(
      (v) => v !== undefined && v !== null && String(v).trim() !== ''
    );
    if (hasDefinedTechValue) return true;
  }

  let rawAttributes = variation.attributes;
  if (typeof rawAttributes === 'string' && rawAttributes.trim()) {
    try {
      rawAttributes = JSON.parse(rawAttributes);
    } catch {
      return false;
    }
  }

  // 1. Array de atributos: [{ name: 'Cor', value: 'Azul' }, ...]
  if (Array.isArray(rawAttributes)) {
    if (rawAttributes.length === 0) return false;

    return rawAttributes.every((attr: any) => {
      if (!attr) return false;
      const name = String(attr.name || attr.attribute || attr.key || '').trim();
      const val = String(attr.value || attr.val || '').trim();
      return name.length > 0 && val.length > 0;
    });
  }

  // 2. Formato dicionário: { "Cor": "Azul", "Tamanho": "M" }
  if (typeof rawAttributes === 'object' && rawAttributes !== null) {
    const entries = Object.entries(rawAttributes);
    if (entries.length === 0) return false;

    return entries.every(([k, v]) => {
      const name = String(k || '').trim();
      const val = String(v || '').trim();
      return name.length > 0 && val.length > 0;
    });
  }

  return false;
};

/**
 * Normaliza os atributos da variação em pares uniformes { name, value, showName }.
 */
export const getVariationAttributePairs = (variation?: Variation | any): AttributePair[] => {
  if (!variation) return [];

  let attributes = variation.attributes;
  if (typeof attributes === 'string') {
    try {
      attributes = JSON.parse(attributes);
    } catch {
      return [];
    }
  }

  if (Array.isArray(attributes)) {
    return attributes
      .map((attr: any) => ({
        name: attr?.name || attr?.attribute || attr?.key,
        value: attr?.value || attr?.val,
        showName: attr?.showName !== false,
      }))
      .filter(({ name, value }) => normalizeAttributePart(name) && normalizeAttributePart(value));
  }

  if (attributes && typeof attributes === 'object') {
    return Object.entries(attributes)
      .map(([name, rawValue]) => {
        const structuredValue =
          rawValue && typeof rawValue === 'object'
            ? (rawValue as { value?: unknown; val?: unknown; showName?: boolean })
            : null;
        return {
          name,
          value: String(structuredValue?.value ?? structuredValue?.val ?? rawValue ?? ''),
          showName: structuredValue?.showName !== false,
        };
      })
      .filter(({ name, value }) => normalizeAttributePart(name) && normalizeAttributePart(value));
  }

  return [];
};

export const getAttributeCombinationKey = (variation?: Variation | any): string =>
  getVariationAttributePairs(variation)
    .map(({ name, value }) => `${normalizeAttributePart(name)}=${normalizeAttributePart(value)}`)
    .sort()
    .join('|');

/**
 * Valida se já existe outra variação com a mesma combinação de atributos e valores.
 */
export const hasDuplicateVariationAttributeCombination = (
  variation: Variation | any,
  variations: Variation[] = []
): boolean => {
  const combination = getAttributeCombinationKey(variation);
  if (!combination) return false;

  return variations.some((otherVariation) => {
    if (String(otherVariation.id || '') === String(variation.id || '')) return false;
    return getAttributeCombinationKey(otherVariation) === combination;
  });
};

/**
 * Verifica se alguma das variações fornecidas carece de atributos obrigatórios válidos.
 */
export const hasMissingRequiredAttributes = (variations: Variation[] = []): boolean => {
  if (!variations || variations.length === 0) return true;
  return variations.some((variation) => !hasVariationAttribute(variation));
};
