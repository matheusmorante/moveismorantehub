import { describe, expect, it } from 'vitest';
import {
  canShowMobileProductCategoryFilter,
  canShowMobileTestProducts,
  DEFAULT_MOBILE_PRODUCT_LIST_FILTERS,
  resolveAppliedMobileProductSearch,
  resolveMobileProductListResetState,
  resolveMobileProductStatusFilter,
  resolveSubmittedMobileProductSearch,
  shouldExcludeMobileDraftsDuringSearch,
} from './mobileProductListFilters';
import {
  PRODUCT_LIST_PAGE_SIZES,
  productListFormSchema,
} from '../../../../../shared-utils/listingFormSchemas';

describe('mobileProductListFilters', () => {
  it('usa os padrões do ERP ao limpar filtros', () => {
    expect(DEFAULT_MOBILE_PRODUCT_LIST_FILTERS).toEqual({
      searchTerm: '',
      statusFilter: 'all',
      showDeactivated: true,
      categoryFilter: '',
      catalogStatusFilter: 'all',
      generalTypeFilter: 'all',
      showTestProducts: false,
    });
  });

  it('limpa os filtros e retorna à página inicial sem desligar toggles independentes', () => {
    expect(
      resolveMobileProductListResetState({
        showTestProducts: true,
        showMergedProducts: true,
      })
    ).toEqual({
      ...DEFAULT_MOBILE_PRODUCT_LIST_FILTERS,
      showTestProducts: true,
      showMergedProducts: true,
      currentPage: 1,
    });
  });

  it('applies searches at three characters and clears the previous search for shorter input', () => {
    expect(resolveAppliedMobileProductSearch('ca')).toBe('');
    expect(resolveAppliedMobileProductSearch(' cadeira ')).toBe('cadeira');
    expect(resolveAppliedMobileProductSearch('  ')).toBe('');
  });

  it('matches ERP Enter submission for valid, empty, and too-short search terms', () => {
    expect(resolveSubmittedMobileProductSearch(' cadeira ')).toBe('cadeira');
    expect(resolveSubmittedMobileProductSearch('  ')).toBe('');
    expect(resolveSubmittedMobileProductSearch('ca')).toBeNull();
  });

  it('preserves status filters without a search and keeps draft searches scoped to drafts', () => {
    expect(resolveMobileProductStatusFilter('active', '')).toBe('active');
    expect(resolveMobileProductStatusFilter('draft', 'teste')).toBe('draft');
  });

  it('suspends only active/deactivated status filters while searching, as in the ERP', () => {
    expect(resolveMobileProductStatusFilter('active', '  cadeira  ')).toBe('all');
    expect(resolveMobileProductStatusFilter('disabled', 'mesa')).toBe('all');
    expect(resolveMobileProductStatusFilter('all', 'mesa')).toBe('all');
  });

  it('preserves the non-draft constraint only for active/deactivated searches', () => {
    expect(shouldExcludeMobileDraftsDuringSearch('active', 'cadeira')).toBe(true);
    expect(shouldExcludeMobileDraftsDuringSearch('disabled', 'mesa')).toBe(true);
    expect(shouldExcludeMobileDraftsDuringSearch('all', 'mesa')).toBe(false);
    expect(shouldExcludeMobileDraftsDuringSearch('draft', 'mesa')).toBe(false);
    expect(shouldExcludeMobileDraftsDuringSearch('active', '   ')).toBe(false);
  });

  it('allows the test-data toggle only for administrators', () => {
    expect(canShowMobileTestProducts(true, true)).toBe(true);
    expect(canShowMobileTestProducts(false, true)).toBe(false);
    expect(canShowMobileTestProducts(true, false)).toBe(false);
  });

  it('shows category choices only when the profile can view categories or configure products', () => {
    expect(canShowMobileProductCategoryFilter(false, false)).toBe(false);
    expect(canShowMobileProductCategoryFilter(true, false)).toBe(true);
    expect(canShowMobileProductCategoryFilter(false, true)).toBe(true);
  });

  it('validates the test-data visibility flag with the product-list domain schema', () => {
    const filters = {
      page: 1,
      itemsPerPage: 15,
      search: '',
      statusFilter: 'all',
      category: '',
      catalogStatus: 'all',
      itemType: 'standard',
      generalType: 'all',
      includeDeactivated: true,
      showTrash: false,
      showMergedProducts: false,
    };

    expect(productListFormSchema.safeParse({ ...filters, showTestProducts: false }).success).toBe(true);
    expect(productListFormSchema.safeParse({ ...filters, showTestProducts: true }).success).toBe(true);
    expect(productListFormSchema.safeParse({ ...filters, showTestProducts: 'true' }).success).toBe(false);
  });

  it('validates merged-product visibility before the list query', () => {
    const filters = {
      page: 1,
      itemsPerPage: 15,
      search: '',
      statusFilter: 'all',
      category: '',
      catalogStatus: 'all',
      itemType: 'standard',
      generalType: 'all',
      includeDeactivated: true,
      showTrash: false,
      showTestProducts: false,
    };

    expect(productListFormSchema.safeParse({ ...filters, showMergedProducts: false }).success).toBe(true);
    expect(productListFormSchema.safeParse({ ...filters, showMergedProducts: true }).success).toBe(true);
    expect(productListFormSchema.safeParse({ ...filters, showMergedProducts: 'true' }).success).toBe(false);
  });

  it.each(PRODUCT_LIST_PAGE_SIZES)('accepts the ERP page size %i in the mobile product-list schema', (itemsPerPage) => {
    const filters = {
      page: 1,
      itemsPerPage,
      search: '',
      statusFilter: 'all',
      category: '',
      catalogStatus: 'all',
      itemType: 'standard',
      generalType: 'all',
      includeDeactivated: true,
      showTrash: false,
      showTestProducts: false,
      showMergedProducts: false,
    };

    expect(productListFormSchema.safeParse(filters).success).toBe(true);
  });
});
