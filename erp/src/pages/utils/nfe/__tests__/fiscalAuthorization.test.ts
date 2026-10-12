import { describe, expect, it, vi } from 'vitest';
import { authorizeFiscalOperator } from '../../../../../../api/nfe/fiscalAuthorization';
import { hasFiscalAdministratorRole, hasFiscalOperationRole } from '../fiscalAuthorization';

describe('fiscal operation role policy', () => {
  it.each(['manager', 'administrator'])('allows %s', (role) => {
    expect(hasFiscalOperationRole({ role })).toBe(true);
  });

  it('allows an operator role stored in the multi-role field', () => {
    expect(hasFiscalOperationRole({ role: 'accountant', roles: ['accountant', 'manager'] })).toBe(
      true
    );
  });

  it.each(['seller', 'accountant', 'stockist', 'deliverer', 'pending', '', null])(
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

describe('fiscal XML preview administrator policy', () => {
  it.each([
    [{ role: 'administrator' }, true],
    [{ role: 'manager' }, false],
    [{ role: 'seller', roles: ['seller', 'administrator'] }, true],
    [{ role: 'seller', roles: ['seller'] }, false],
    [null, false],
  ] as const)('resolves administrator access from protected roles', (profile, expected) => {
    expect(hasFiscalAdministratorRole(profile)).toBe(expected);
  });
});

describe('autorização fiscal no backend', () => {
  it('recusa chamada sem token antes de consultar o banco', async () => {
    const getUser = vi.fn();
    const result = await authorizeFiscalOperator({ auth: { getUser } } as any, undefined);
    expect(result).toMatchObject({ ok: false, status: 401 });
    expect(getUser).not.toHaveBeenCalled();
  });
  it.each([
    ['stockist', false],
    ['seller', false],
    ['manager', true],
    ['administrator', true],
  ] as const)('valida o papel %s pelo usuário autenticado', async (role, ok) => {
    const client = {
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'operator' } }, error: null }),
      },
      from: () => ({
        select: () => ({
          eq: () => ({ maybeSingle: async () => ({ data: { role }, error: null }) }),
        }),
      }),
    };
    const result = await authorizeFiscalOperator(client as any, 'Bearer TEST_TOKEN');
    expect(result.ok).toBe(ok);
    if (ok)
      expect(result).toMatchObject({
        userId: 'operator',
        isAdministrator: role === 'administrator',
      });
    else expect(result).toMatchObject({ status: 403 });
  });
});
