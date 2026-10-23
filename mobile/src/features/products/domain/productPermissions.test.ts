import { describe, expect, it } from 'vitest';
import { hasProductPermission, hasRolePermission } from '../../../../../shared-utils/productPermissions';

describe('product and module role permissions', () => {
  it('uses configured roles over defaults and normalizes aliases', () => {
    expect(hasRolePermission('viewMetaCatalog', ['seller'], ['manager'])).toBe(false);
    expect(
      hasRolePermission('viewMetaCatalog', ['seller'], ['manager'], {
        viewMetaCatalog: ['vendedor'],
      })
    ).toBe(true);
    expect(
      hasRolePermission('viewMetaCatalog', ['manager'], ['manager'], {
        viewMetaCatalog: [],
      })
    ).toBe(false);
  });

  it('grants administrator access without treating unknown product permissions as valid', () => {
    expect(hasRolePermission('viewMetaCatalog', ['admin'], ['manager'])).toBe(true);
    expect(hasProductPermission('viewMetaCatalog', ['admin'])).toBe(false);
  });
});
