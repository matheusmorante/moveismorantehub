/**
 * Resolução de herança, sobreposição (override) e equivalência de valores técnicos entre pai e variações.
 */

import type { Variation } from '../../types/product.type';
import { isDefined } from './predicates';
import { normalizeCharacteristicName } from './predicates/normalization';
import type { TechnicalFieldDefinition, TechnicalValuesMap } from './types';

export const getEffectiveVariationTechnicalValues = (
  parentValues: TechnicalValuesMap = {},
  variation?: Pick<Variation, 'attributes' | 'technicalValues'> | null,
  variableFieldNames?: readonly string[]
): TechnicalValuesMap => {
  const shouldApplyOverride = (name: string) =>
    variableFieldNames === undefined || isTechnicalFieldVariable(name, variableFieldNames);
  const legacyCharacteristicValues = (variation?.attributes || []).reduce<TechnicalValuesMap>(
    (values, characteristic) => {
      if (
        characteristic.name?.trim() &&
        characteristic.value?.trim() &&
        shouldApplyOverride(characteristic.name)
      ) {
        values[characteristic.name] = characteristic.value;
      }
      return values;
    },
    {}
  );
  const variationCharacteristicValues = Object.fromEntries(
    Object.entries(variation?.technicalValues || {}).filter(
      ([name, value]) => value !== undefined && value !== null && shouldApplyOverride(name)
    )
  );

  return {
    ...parentValues,
    ...legacyCharacteristicValues,
    ...variationCharacteristicValues,
  };
};

const getCandidateKeys = (key: string): string[] => {
  const norm = key.trim().toLocaleLowerCase('pt-BR');
  if (
    norm === 'modelo/linha' ||
    norm === 'modelo / linha' ||
    norm === 'linha/modelo' ||
    norm === 'linha / modelo'
  ) {
    return [key, 'Modelo/Linha', 'modelo/linha', 'Linha/Modelo', 'linha/modelo', 'Modelo', 'modelo', 'Linha', 'linha'];
  }
  if (norm === 'modelo') {
    return [key, 'Modelo', 'modelo', 'Modelo/Linha', 'modelo/linha', 'Linha/Modelo', 'linha/modelo', 'Linha', 'linha'];
  }
  if (norm === 'linha') {
    return [key, 'Linha', 'linha', 'Modelo/Linha', 'modelo/linha', 'Linha/Modelo', 'linha/modelo', 'Modelo', 'modelo'];
  }
  return [key];
};

/**
 * Resolve o valor efetivo de uma Especificação Técnica para uma variação.
 * Regra: valor efetivo = override da variação ?? valor do produto pai.
 * Respeita estritamente valores falsy intencionais como 0, false e "".
 */
export const getEffectiveTechnicalValue = (
  parentValues: TechnicalValuesMap = {},
  variationOverrides: TechnicalValuesMap = {},
  fieldKeyOrName: string
): any => {
  if (!fieldKeyOrName) return undefined;

  const candidateKeys = getCandidateKeys(fieldKeyOrName);

  // 1. Tentar override direto na variação
  for (const key of candidateKeys) {
    if (Object.prototype.hasOwnProperty.call(variationOverrides, key)) {
      const overrideVal = variationOverrides[key];
      if (isDefined(overrideVal)) {
        return overrideVal;
      }
    }
  }

  // 2. Fallback para valor padrão do produto pai
  for (const key of candidateKeys) {
    if (Object.prototype.hasOwnProperty.call(parentValues, key)) {
      const parentVal = parentValues[key];
      if (isDefined(parentVal)) {
        return parentVal;
      }
    }
  }

  return undefined;
};

/**
 * Verifica se a variação tem um override ativo para o campo.
 */
export const hasVariationOverride = (
  variationOverrides: TechnicalValuesMap = {},
  fieldKeyOrName: string
): boolean => {
  const candidateKeys = getCandidateKeys(fieldKeyOrName);
  return candidateKeys.some(
    (key) =>
      Object.prototype.hasOwnProperty.call(variationOverrides, key) &&
      isDefined(variationOverrides[key])
  );
};

/**
 * Remove o override de uma variação, fazendo com que ela volte a herdar o valor do pai.
 */
export const removeVariationOverride = (
  variationOverrides: TechnicalValuesMap = {},
  fieldKeyOrName: string
): TechnicalValuesMap => {
  const updated = { ...variationOverrides };
  const candidateKeys = getCandidateKeys(fieldKeyOrName);
  candidateKeys.forEach((key) => {
    delete updated[key];
  });
  return updated;
};

/**
 * Define um override específico na variação.
 */
export const setVariationOverride = (
  variationOverrides: TechnicalValuesMap = {},
  fieldKeyOrName: string,
  value: any
): TechnicalValuesMap => {
  return {
    ...variationOverrides,
    [fieldKeyOrName]: value,
  };
};

export const isTechnicalFieldVariable = (
  fieldName: string,
  variableFieldNames: readonly string[] = []
): boolean => {
  const candidates = getCandidateKeys(fieldName).map(normalizeCharacteristicName);
  return variableFieldNames.some((name) =>
    getCandidateKeys(name).some((candidate) => candidates.includes(normalizeCharacteristicName(candidate)))
  );
};

/** Legacy products stored variability as per-variation overrides. */
export const getLegacyVariableTechnicalFieldNames = (
  variations: readonly Pick<Variation, 'attributes' | 'technicalValues'>[] = []
): string[] => {
  const names = new Map<string, string>();
  const addName = (name: string) => {
    const trimmed = name.trim();
    const normalized = normalizeCharacteristicName(trimmed);
    if (normalized && !names.has(normalized)) names.set(normalized, trimmed);
  };

  variations.forEach((variation) => {
    (variation.attributes || []).forEach((attribute) => {
      if (attribute.name?.trim() && String(attribute.value ?? '').trim()) addName(attribute.name);
    });
    Object.entries(variation.technicalValues || {}).forEach(([name, value]) => {
      if (isDefined(value)) addName(name);
    });
  });

  return [...names.values()];
};

export const resolveVariableTechnicalFieldNames = (
  configuredNames: readonly string[] | undefined,
  variations: readonly Pick<Variation, 'attributes' | 'technicalValues'>[] = []
): string[] => configuredNames ?? getLegacyVariableTechnicalFieldNames(variations);

/**
 * Compara se duas combinações de Especificações Técnicas são efetivamente idênticas.
 */
export const areEffectiveValuesEqual = (
  fields: TechnicalFieldDefinition[],
  valuesA: TechnicalValuesMap,
  valuesB: TechnicalValuesMap
): boolean => {
  for (const field of fields) {
    const valA = valuesA[field.name];
    const valB = valuesB[field.name];

    if (
      String(valA ?? '')
        .trim()
        .toLowerCase() !==
      String(valB ?? '')
        .trim()
        .toLowerCase()
    ) {
      return false;
    }
  }
  return true;
};

/**
 * Valida se uma variação possui ao menos UMA informação técnica efetivamente diferente do pai.
 */
export const hasEffectiveDifferenceFromParent = (
  fields: TechnicalFieldDefinition[],
  parentValues: TechnicalValuesMap = {},
  variationEffectiveValues: TechnicalValuesMap = {}
): boolean => {
  for (const field of fields) {
    const parentVal = parentValues[field.name];
    const varVal = variationEffectiveValues[field.name];

    const normParent = String(parentVal ?? '')
      .trim()
      .toLowerCase();
    const normVar = String(varVal ?? '')
      .trim()
      .toLowerCase();

    if (normParent !== normVar) {
      return true;
    }
  }
  return false;
};
