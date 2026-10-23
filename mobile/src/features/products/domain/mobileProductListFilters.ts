import { PRODUCT_LIST_SEARCH_MIN_LENGTH } from '../../../../../shared-utils/productListSearch';

export type MobileProductStatusFilter = 'all' | 'active' | 'disabled' | 'draft';

export const DEFAULT_MOBILE_PRODUCT_LIST_FILTERS = {
  searchTerm: '',
  statusFilter: 'all' as const,
  showDeactivated: true,
  categoryFilter: '',
  catalogStatusFilter: 'all' as const,
  generalTypeFilter: 'all' as const,
};

export const resolveAppliedMobileProductSearch = (
  searchInput: string
): string => {
  const trimmedSearch = searchInput.trim();
  return trimmedSearch.length >= PRODUCT_LIST_SEARCH_MIN_LENGTH ? trimmedSearch : '';
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

export const canShowMobileTestProducts = (
  isAdministrator: boolean,
  showTestProducts: boolean
): boolean => isAdministrator && showTestProducts;
