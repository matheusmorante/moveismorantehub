export interface MobileProductSearchTerms {
  safeSearch: string;
  searchTerms: string[];
  wordTerms: Array<{ value: string; alternative?: string }>;
}

const removeAccents = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

export const buildMobileProductSearchTerms = (search: string): MobileProductSearchTerms => {
  const safeSearch = search.trim().replace(/[(),]/g, ' ').replace(/[%_]/g, '');
  if (!safeSearch) return { safeSearch, searchTerms: [], wordTerms: [] };

  const unaccented = removeAccents(safeSearch);
  const spaceNormalized = unaccented.replace(/[-_]/g, ' ');
  const yToI = spaceNormalized.replace(/y/gi, 'i');
  const iToY = spaceNormalized.replace(/i/gi, 'y');
  const searchTerms = Array.from(
    new Set([safeSearch, unaccented, spaceNormalized, yToI, iToY])
  ).filter(Boolean);
  const wordTerms = spaceNormalized
    .split(/\s+/)
    .filter(Boolean)
    .map((value) => ({
      value,
      alternative: /[yi]/i.test(value) ? value.replace(/y/gi, 'i') : undefined,
    }));

  return { safeSearch, searchTerms, wordTerms };
};
