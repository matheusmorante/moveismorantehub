import { buildPostgrestAccentInsensitiveOrFilter, buildPostgrestAccentInsensitivePattern } from './searchText';

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
    new Set([safeSearch, spaceNormalized, yToI, iToY])
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

const phraseFilter = (columns: readonly string[], term: string): string => {
  const pattern = buildPostgrestAccentInsensitivePattern(term);
  return pattern ? columns.map((column) => `${column}.imatch.${pattern}`).join(',') : '';
};

const wordConjunction = (columns: readonly string[], words: ProductSearchTerms['wordTerms']): string =>
  `and(${words.map(({ value, alternative }) => {
    const terms = [value, alternative, value.replace(/y/gi, 'i'), value.replace(/i/gi, 'y')].filter(Boolean) as string[];
    const filters = Array.from(new Set(terms.map((term) => buildPostgrestAccentInsensitiveOrFilter(columns, term))));
    return `or(${filters.join(',')})`;
  }).join(',')})`;

export const buildProductVariationSearchFilter = (searchTerms: readonly string[]): string => {
  const words = buildProductSearchTerms(searchTerms[0] || '').wordTerms;
  if (words.length > 1) return wordConjunction(['name', 'sku'], words);
  return Array.from(new Set(searchTerms.map((term) => phraseFilter(['name', 'sku'], term)).filter(Boolean))).join(',');
};

export const buildProductParentSearchFilter = (
  search: Pick<ProductSearchTerms, 'searchTerms' | 'wordTerms'>,
  variationParentIds: readonly string[] = []
): string => {
  const conditions: string[] = [];

  if (search.wordTerms.length > 1) {
    conditions.push(wordConjunction(['name', 'code'], search.wordTerms));
  } else {
    conditions.push(...new Set(search.searchTerms.map((term) => phraseFilter(['name', 'code'], term)).filter(Boolean)));
  }

  variationParentIds.forEach((id) => conditions.push(`id.eq.${id}`));

  return conditions.join(',');
};

export const createProductVariationSearchTooBroadError = (): Error => {
  const error = new Error(PRODUCT_VARIATION_SEARCH_TOO_BROAD_MESSAGE);
  error.name = 'ProductVariationSearchTooBroadError';
  return error;
};

export const isProductVariationSearchTooBroadError = (error: unknown): error is Error =>
  error instanceof Error && error.name === 'ProductVariationSearchTooBroadError';

