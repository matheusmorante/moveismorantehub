export const PRODUCT_LIST_SEARCH_MIN_LENGTH = 3;
export const PRODUCT_LIST_SEARCH_DEBOUNCE_MS = 350;
export const PRODUCT_VARIATION_SEARCH_MATCH_LIMIT = 100;
export const PRODUCT_VARIATION_SEARCH_TOO_BROAD_MESSAGE =
  'A busca encontrou muitas variações correspondentes. Refine o termo e tente novamente.';

export interface ProductSearchTerms {
  safeSearch: string;
  searchTerms: string[];
  wordTerms: Array<{ value: string; alternative?: string }>;
}

const removeAccents = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

export const buildProductSearchTerms = (search: string): ProductSearchTerms => {
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

export const createProductVariationSearchTooBroadError = (): Error => {
  const error = new Error(PRODUCT_VARIATION_SEARCH_TOO_BROAD_MESSAGE);
  error.name = 'ProductVariationSearchTooBroadError';
  return error;
};

export const isProductVariationSearchTooBroadError = (error: unknown): error is Error =>
  error instanceof Error && error.name === 'ProductVariationSearchTooBroadError';
