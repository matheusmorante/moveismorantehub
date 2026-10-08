import { describe, expect, it } from 'vitest';
import {
  canShowMobileTestProducts,
  resolveAppliedMobileProductSearch,
  resolveMobileProductStatusFilter,
} from './mobileProductListFilters';

describe('mobileProductListFilters', () => {
  it('applies searches only at three characters and preserves the last search for shorter input', () => {
    expect(resolveAppliedMobileProductSearch('ca', 'cadeira')).toBe('cadeira');
    expect(resolveAppliedMobileProductSearch(' cadeira ', '')).toBe('cadeira');
    expect(resolveAppliedMobileProductSearch('  ', 'cadeira')).toBe('');
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
