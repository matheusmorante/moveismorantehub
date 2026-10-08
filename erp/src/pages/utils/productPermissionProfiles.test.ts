import { describe, expect, it } from 'vitest';
import {
  isStockistOnlyProductProfile,
  shouldHideProductCatalogPublicationStatus,
} from '../../../../shared-utils/productPermissions';

describe('product profile visibility rules', () => {
  it('limits stockist-only forms and hides catalog status', () => {
    const stockist = { role: 'manager', roles: ['stockist', 'pending'] };

    expect(isStockistOnlyProductProfile(stockist)).toBe(true);
    expect(shouldHideProductCatalogPublicationStatus(stockist)).toBe(true);
  });

  it('falls back to the primary role when the roles list is empty', () => {
    const stockist = { role: 'stockist', roles: [] };

    expect(isStockistOnlyProductProfile(stockist)).toBe(true);
    expect(shouldHideProductCatalogPublicationStatus(stockist)).toBe(true);
  });

  it('retains catalog visibility for mixed or seller profiles', () => {
    expect(shouldHideProductCatalogPublicationStatus({ roles: ['stockist', 'manager'] })).toBe(
      false
    );
    expect(shouldHideProductCatalogPublicationStatus({ role: 'seller' })).toBe(false);
    expect(isStockistOnlyProductProfile({ roles: ['stockist', 'seller'] })).toBe(false);
  });
});
