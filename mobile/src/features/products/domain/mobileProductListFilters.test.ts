import { describe, expect, it } from 'vitest';
import {
  canShowMobileTestProducts,
  DEFAULT_MOBILE_PRODUCT_LIST_FILTERS,
  resolveAppliedMobileProductSearch,
  resolveMobileProductStatusFilter,
} from './mobileProductListFilters';

describe('mobileProductListFilters', () => {
  it('usa os padrões do ERP ao limpar filtros', () => {
    expect(DEFAULT_MOBILE_PRODUCT_LIST_FILTERS).toEqual({
      searchTerm: '',
      statusFilter: 'all',
      showDeactivated: true,
      categoryFilter: '',
      catalogStatusFilter: 'all',
      generalTypeFilter: 'all',
    });
  });

  it('applies searches at three characters and clears the previous search for shorter input', () => {
    expect(resolveAppliedMobileProductSearch('ca')).toBe('');
    expect(resolveAppliedMobileProductSearch(' cadeira ')).toBe('cadeira');
    expect(resolveAppliedMobileProductSearch('  ')).toBe('');
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

  it('allows the test-data toggle only for administrators', () => {
    expect(canShowMobileTestProducts(true, true)).toBe(true);
    expect(canShowMobileTestProducts(false, true)).toBe(false);
    expect(canShowMobileTestProducts(true, false)).toBe(false);
  });
});
