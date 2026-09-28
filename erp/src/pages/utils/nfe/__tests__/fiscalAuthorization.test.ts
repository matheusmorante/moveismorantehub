import { describe, expect, it } from 'vitest';
import { hasFiscalOperationRole } from '../fiscalAuthorization';

describe('fiscal operation role policy', () => {
  it.each(['seller', 'manager', 'administrator'])('allows %s', (role) => {
    expect(hasFiscalOperationRole({ role })).toBe(true);
  });

  it('allows an operator role stored in the multi-role field', () => {
    expect(hasFiscalOperationRole({ role: 'accountant', roles: ['accountant', 'seller'] })).toBe(true);
  });

  it.each(['accountant', 'stockist', 'deliverer', 'pending', '', null])(
    'denies %s when no operator role is assigned',
    (role) => {
      expect(hasFiscalOperationRole({ role, roles: [] })).toBe(false);
    }
  );

  it('denies missing profiles', () => {
    expect(hasFiscalOperationRole(null)).toBe(false);
    expect(hasFiscalOperationRole(undefined)).toBe(false);
  });
});
