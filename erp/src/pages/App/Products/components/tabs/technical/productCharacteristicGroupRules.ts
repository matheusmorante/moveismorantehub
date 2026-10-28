import type { CharacteristicGroup } from '@/pages/types/variation.type';
import type { TechnicalFieldDefinition } from '@/pages/utils/technicalValuesService';
import {
  resolveProductCharacteristicApplication,
  type ProductCharacteristicApplication,
} from '../../../../../../../../shared-utils/productCharacteristicApplications';

export { resolveProductCharacteristicApplication };
export type { ProductCharacteristicApplication };

export type ProductCharacteristicGroupView = CharacteristicGroup & {
  fields: TechnicalFieldDefinition[];
  availableFields: TechnicalFieldDefinition[];
};

export const hasSavedCharacteristicGroupValues = (
  groupId: string,
  fields: readonly { id: string; name: string; groupId?: string }[],
  product: {
    technicalValues?: Record<string, unknown>;
    variableTechnicalFields?: string[];
    variations?: Array<{
      technicalValues?: Record<string, unknown>;
      attributes?: Array<{ name: string; value: string }>;
    }>;
  }
): boolean => {
  const names = new Set(
    fields
      .filter((field) => field.groupId === groupId)
      .map((field) => field.name.trim().toLocaleLowerCase('pt-BR'))
  );
  if (names.size === 0) return false;

  if (product.variableTechnicalFields?.some((name) => names.has(name.trim().toLocaleLowerCase('pt-BR')))) {
    return true;
  }

  const hasAnyKey = (values?: Record<string, unknown>) =>
    Object.keys(values || {}).some((name) => names.has(name.trim().toLocaleLowerCase('pt-BR')));
  if (hasAnyKey(product.technicalValues)) return true;

  return (product.variations || []).some(
    (variation) =>
      hasAnyKey(variation.technicalValues) ||
      (variation.attributes || []).some((attribute) =>
        names.has(attribute.name.trim().toLocaleLowerCase('pt-BR'))
      )
  );
};

export const getSavedCharacteristicIds = (
  fields: readonly { id: string; name: string; groupId?: string }[],
  product: {
    technicalValues?: Record<string, unknown>;
    variableTechnicalFields?: string[];
    variations?: Array<{
      technicalValues?: Record<string, unknown>;
      attributes?: Array<{ name: string; value: string }>;
    }>;
  }
): string[] => {
  const normalize = (value: string) => value.trim().toLocaleLowerCase('pt-BR');
  const isNotInform = (value: unknown) =>
    typeof value === 'string' &&
    ['não informar', 'nao informar', 'não se aplica', 'nao se aplica', 'n/a'].includes(
      normalize(value)
    );
  const keys = new Set<string>();
  const addValues = (values?: Record<string, unknown>) =>
    Object.entries(values || {}).forEach(([name, value]) => {
      if (!isNotInform(value)) keys.add(normalize(name));
    });
  addValues(product.technicalValues);
  const variableNames = new Set((product.variableTechnicalFields || []).map(normalize));
  for (const variation of product.variations || []) {
    addValues(variation.technicalValues);
    (variation.attributes || []).forEach((attribute) => {
      if (!isNotInform(attribute.value)) keys.add(normalize(attribute.name));
    });
  }
  return fields
    .filter((field) => keys.has(normalize(field.name)) || variableNames.has(normalize(field.name)))
    .map((field) => field.id);
};
