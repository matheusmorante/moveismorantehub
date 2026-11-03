import type { ProductTechnicalField } from './productCharacteristicDefinitions';

const normalizeTechnicalSearchText = (value: unknown) =>
  String(value ?? '')
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pt-BR');

/**
 * Keeps the legacy three-result limit for ungrouped fields, while matching a
 * persisted group name returns every addable field from that group, as in ERP.
 */
export function getMobileProductTechnicalSearchMatches<T extends ProductTechnicalField>(
  fields: readonly T[],
  searchTerm: string,
  legacyResultLimit = 3,
): T[] {
  const normalizedTerm = normalizeTechnicalSearchText(searchTerm);
  if (!normalizedTerm) return [];

  const matchingGroupKeys = new Set(
    fields
      .filter((field) => normalizeTechnicalSearchText(field.groupName).includes(normalizedTerm))
      .map((field) => field.groupId || normalizeTechnicalSearchText(field.groupName))
      .filter(Boolean),
  );

  const matchingPersistedFields = fields.filter((field) => {
    if (!field.groupName?.trim()) return false;
    const groupKey = field.groupId || normalizeTechnicalSearchText(field.groupName);
    return matchingGroupKeys.has(groupKey) ||
      normalizeTechnicalSearchText(field.name).includes(normalizedTerm);
  });
  const matchingLegacyFields = fields
    .filter((field) => !field.groupName?.trim())
    .filter((field) => normalizeTechnicalSearchText(field.name).includes(normalizedTerm))
    .slice(0, legacyResultLimit);

  return [...matchingPersistedFields, ...matchingLegacyFields];
}
