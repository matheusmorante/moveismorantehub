export type MobileProductStatusFilter = 'all' | 'active' | 'disabled' | 'draft';

export const resolveAppliedMobileProductSearch = (
  searchInput: string,
  previousSearch: string
): string => {
  const trimmedSearch = searchInput.trim();
  return trimmedSearch.length === 0 || trimmedSearch.length >= 3 ? trimmedSearch : previousSearch;
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
