/**
 * Resolução de herança, sobreposição (override) e equivalência de valores técnicos entre pai e variações.
 */

import type { Variation } from '../../types/product.type';
import { isDefined } from './predicates';
import type { TechnicalFieldDefinition, TechnicalValuesMap } from './types';

export const getEffectiveVariationTechnicalValues = (
  parentValues: TechnicalValuesMap = {},
  variation?: Pick<Variation, 'attributes' | 'technicalValues'> | null
): TechnicalValuesMap => {
  const legacyCharacteristicValues = (variation?.attributes || []).reduce<TechnicalValuesMap>(
    (values, characteristic) => {
      if (characteristic.name?.trim() && characteristic.value?.trim()) {
        values[characteristic.name] = characteristic.value;
      }
      return values;
    },
    {}
  );
  const variationCharacteristicValues = Object.fromEntries(
    Object.entries(variation?.technicalValues || {}).filter(
      ([, value]) => value !== undefined && value !== null
    )
  );

  return {
    ...parentValues,
    ...legacyCharacteristicValues,
    ...variationCharacteristicValues,
  };
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

  // 1. Tentar override direto na variação
  if (Object.prototype.hasOwnProperty.call(variationOverrides, fieldKeyOrName)) {
    const overrideVal = variationOverrides[fieldKeyOrName];
    if (isDefined(overrideVal)) {
      return overrideVal;
    }
  }

  // 2. Fallback para valor padrão do produto pai
  if (Object.prototype.hasOwnProperty.call(parentValues, fieldKeyOrName)) {
    const parentVal = parentValues[fieldKeyOrName];
    if (isDefined(parentVal)) {
      return parentVal;
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
  return (
    Object.prototype.hasOwnProperty.call(variationOverrides, fieldKeyOrName) &&
    isDefined(variationOverrides[fieldKeyOrName])
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
  delete updated[fieldKeyOrName];
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
