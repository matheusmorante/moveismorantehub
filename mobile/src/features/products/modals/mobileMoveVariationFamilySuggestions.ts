import { matchesSearchText } from '../../../../../shared-utils/searchText';
import type { MobileVariationFamily } from '../services/mobileProductVariationActionsService';

export const getMobileVariationFamilyName = (family: MobileVariationFamily) =>
  family.name || family.description || '';

const normalize = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pt-BR');

export const getMobileVariationFamilySuggestions = (
  families: readonly MobileVariationFamily[],
  familyQuery: string,
  targetFamilyId: string,
): MobileVariationFamily[] => {
  const term = normalize(familyQuery.trim());
  if (term.length < 3 || targetFamilyId) return [];
  return families
    .filter((family) =>
      matchesSearchText(`${getMobileVariationFamilyName(family)} ${family.code || ''}`, term)
    )
    .slice(0, 5);
};
