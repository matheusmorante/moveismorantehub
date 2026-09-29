import { hasPublicCatalogItem } from './product-visibility';

export const MAX_PRODUCT_SEARCH_SUGGESTIONS = 5;
export const CATALOG_PRODUCT_PAGE_SIZE = 15;
export const MIN_CATALOG_SEARCH_LENGTH = 3;

export function normalizeCatalogSearchInput(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

export function isCatalogSearchLongEnough(value: string): boolean {
  return normalizeCatalogSearchInput(value).replace(/\s/g, '').length >= MIN_CATALOG_SEARCH_LENGTH;
}

export function orderCatalogSearchResultsByIds<T extends { id: string }>(
  products: readonly T[],
  orderedIds: readonly string[]
): T[] {
  const orderById = new Map(orderedIds.map((id, index) => [id, index]));
  return products
    .filter((product) => orderById.has(product.id))
    .slice()
    .sort((left, right) => orderById.get(left.id)! - orderById.get(right.id)!);
}

interface CatalogSearchCandidate {
  status?: string | null;
  deleted_at?: string | null;
  product_variations?: Array<{ status?: string | null }> | null;
}

export function filterPublicCatalogSuggestions<T extends CatalogSearchCandidate>(
  products: readonly T[],
  matches: (product: T) => boolean = () => true
): T[] {
  return products
    .filter((product) => hasPublicCatalogItem(product) && matches(product))
    .slice(0, MAX_PRODUCT_SEARCH_SUGGESTIONS);
}
