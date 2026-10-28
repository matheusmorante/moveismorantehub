import { productListSearchFormSchema } from '../../../../../shared-utils/listingFormSchemas';

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
  const parsed = productListSearchFormSchema.safeParse({
    input: searchInput,
    intent: 'debounced',
  });
  return parsed.success && parsed.data.search !== null ? parsed.data.search : '';
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

export const canShowMobileProductCategoryFilter = (
  canViewCategories: boolean,
  canEditProducts: boolean
): boolean => canViewCategories || canEditProducts;
