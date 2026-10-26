import { PRODUCT_LIST_SEARCH_MIN_LENGTH } from '../../../../../shared-utils/productListSearch';

export type MobileProductStatusFilter = 'all' | 'active' | 'disabled' | 'draft';

export const DEFAULT_MOBILE_PRODUCT_LIST_FILTERS = {
  searchTerm: '',
  statusFilter: 'all' as const,
  showDeactivated: true,
  categoryFilter: '',
  catalogStatusFilter: 'all' as const,
  generalTypeFilter: 'all' as const,
  showTestProducts: false,
};

export const resolveMobileProductListResetState = (current: {
  showTestProducts: boolean;
  showMergedProducts: boolean;
}) => ({
  ...DEFAULT_MOBILE_PRODUCT_LIST_FILTERS,
  showTestProducts: current.showTestProducts,
  showMergedProducts: current.showMergedProducts,
  currentPage: 1,
});

export const resolveAppliedMobileProductSearch = (
  searchInput: string
): string => {
  const trimmedSearch = searchInput.trim();
  return trimmedSearch.length >= PRODUCT_LIST_SEARCH_MIN_LENGTH ? trimmedSearch : '';
};

/** Applies the ERP's Enter behavior: submit a valid term, clear an empty one, and ignore 1–2 characters. */
export const resolveSubmittedMobileProductSearch = (
  searchInput: string
): string | null => {
  const trimmedSearch = searchInput.trim();
  if (trimmedSearch.length === 0) return '';
  return trimmedSearch.length >= PRODUCT_LIST_SEARCH_MIN_LENGTH ? trimmedSearch : null;
};

/**
 * No ERP, a busca textual suspende o filtro ativo/desativado, mas preserva a
 * consulta específica de rascunhos.
 */
export const resolveMobileProductStatusFilter = (
  statusFilter: MobileProductStatusFilter,
  search: string
): MobileProductStatusFilter => {
  if (search.trim() && statusFilter !== 'draft') return 'all';
  return statusFilter;
};

/**
 * O ERP suspende ativo/desativado durante a busca, mas conserva isDraft=false.
 * Portanto, a busca inclui ambos os estados sem passar a incluir rascunhos.
 */
export const shouldExcludeMobileDraftsDuringSearch = (
  statusFilter: MobileProductStatusFilter,
  search: string
): boolean =>
  Boolean(search.trim()) && (statusFilter === 'active' || statusFilter === 'disabled');

export const canShowMobileTestProducts = (
  isAdministrator: boolean,
  showTestProducts: boolean
): boolean => isAdministrator && showTestProducts;

export const canShowMobileProductCategoryFilter = (
  canViewCategories: boolean,
  canEditProducts: boolean
): boolean => canViewCategories || canEditProducts;
