import { describe, expect, it, vi } from 'vitest';
import { deriveAuthRoleFlags } from './authProfilePermissions';

vi.mock('react-native', () => ({ Platform: { OS: 'test' } }));
vi.mock('../../services/supabaseClient', () => ({
  MASTER_DEFAULT_PROFILE: { email: 'admin@example.com' },
}));

describe('mobile module permission flags', () => {
  it('exposes the products area to a role with only a channel catalog permission', () => {
    const flags = deriveAuthRoleFlags(
      { role: 'manager' },
      {
        viewProducts: [],
        viewProductCharacteristics: [],
        viewProductCategories: [],
        viewProductCompositions: [],
      },
      true
    );

    expect(flags.canUsePermission('viewMetaCatalog', ['manager'])).toBe(true);
    expect(flags.canUsePermission('finalizeStockInventory', ['manager', 'stockist'])).toBe(true);
    expect(flags.canSeeProducts).toBe(true);
  });

  it('does not expose the Products area from reconciliation permission alone', () => {
    const flags = deriveAuthRoleFlags(
      { role: 'manager' },
      {
        viewProducts: [],
        viewProductCharacteristics: [],
        viewProductCategories: [],
        viewProductCompositions: [],
        viewProductReconciliation: ['manager'],
        viewMetaCatalog: [],
        viewWhatsAppMarketplace: [],
      },
      true
    );

    expect(flags.canUseProductPermission('viewProductReconciliation')).toBe(true);
    expect(flags.canSeeProducts).toBe(false);
  });

  it('keeps channel access closed while role permissions are loading', () => {
    const flags = deriveAuthRoleFlags({ role: 'manager' }, {}, false);

    expect(flags.canUsePermission('viewMetaCatalog', ['manager'])).toBe(false);
    expect(flags.canUsePermission('finalizeStockInventory', ['manager', 'stockist'])).toBe(false);
    expect(flags.canSeeProducts).toBe(false);
  });

  it('respects an explicit empty finalization permission list', () => {
    const flags = deriveAuthRoleFlags(
      { role: 'manager' },
      { finalizeStockInventory: [] },
      true
    );

    expect(flags.canUsePermission('finalizeStockInventory', ['manager', 'stockist'])).toBe(false);
  });
});
