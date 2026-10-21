import {
  normalizeNcmSearchText,
  isWoodenBedroomFurnitureByName,
  WOODEN_BEDROOM_FURNITURE_NCM,
} from '../../shared-utils/ncmClassification';

export {
  normalizeNcmSearchText,
  isWoodenBedroomFurnitureByName,
  WOODEN_BEDROOM_FURNITURE_NCM,
};

export type CategoryCandidate = { id: string; name: string; active: boolean; selectable: boolean };
export type NcmCandidate = {
  code: string;
  official_description: string;
  active: boolean;
  is_active: boolean;
  start_date: string | null;
  end_date: string | null;
};

export function isCurrentNcm(candidate: NcmCandidate, today: string): boolean {
  return (
    /^\d{8}$/.test(candidate.code) &&
    candidate.active &&
    candidate.is_active &&
    (!candidate.start_date || candidate.start_date <= today) &&
    (!candidate.end_date || candidate.end_date >= today)
  );
}

export function validateCategoryChoice(
  choice: unknown,
  choices: Map<string, CategoryCandidate>,
  current: Map<string, CategoryCandidate>
): string | null {
  if (typeof choice !== 'string') return null;
  const offered = choices.get(choice);
  const latest = offered && current.get(offered.id);
  return latest?.active && latest.selectable ? latest.id : null;
}

export function validateNcmChoice(
  choice: unknown,
  choices: Map<string, NcmCandidate>,
  current: Map<string, NcmCandidate>,
  today: string
): NcmCandidate | null {
  if (typeof choice !== 'string') return null;
  const offered = choices.get(choice);
  const latest = offered && current.get(offered.code);
  return latest && isCurrentNcm(latest, today) ? latest : null;
}

export function buildNcmSearchTerms(
  title: string,
  category: string,
  material: string,
  description = ''
): string[] {
  const clean = normalizeNcmSearchText(title);
  const words = clean.split(/\s+/).filter((word) => word.length > 2);
  const normalizedCategory = normalizeNcmSearchText(category.split('/').pop() || '');
  const normalizedMaterial = normalizeNcmSearchText(material);
  const descriptionWords = normalizeNcmSearchText(description)
    .split(/\s+/)
    .filter((word) => word.length > 2);
  const descriptionPhrase = descriptionWords.slice(0, 3).join(' ');
  const wardrobeTerms =
    /\b(guarda roupa|roupeiro|closet|armario (de )?(quarto|dormitorio))\b/.test(clean)
    ? ['guarda roupa', 'roupeiro']
    : [];
  // Preserve category/material signals before generic title words.
  const terms = [
    ...wardrobeTerms,
    clean,
    normalizedCategory,
    normalizedMaterial,
    descriptionPhrase,
    ...(words.length >= 2 ? [`${words[0]} ${words[1]}`] : []),
    ...words,
  ];
  return [...new Set(terms.filter((term) => term.length >= 3))].slice(0, 8);
}
