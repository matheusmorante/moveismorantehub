import type { CatalogFilters } from './useCatalogProductsQuery';

interface UseCatalogProductsFilteringOptions {
  rawDbProducts: any[];
  filters?: CatalogFilters;
  dbCategoriesList: any[];
  debouncedSearch: string;
}

/** The database has already filtered and ordered the complete result before pagination. */
export function useCatalogProductsFiltering({ rawDbProducts }: UseCatalogProductsFilteringOptions) {
  return { allProducts: rawDbProducts };
}
