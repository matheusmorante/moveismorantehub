import { describe, expect, it, vi } from 'vitest';
import { authorizeFiscalOperator } from '../../../../../../api/nfe/fiscalAuthorization';
import { hasFiscalOperationRole } from '../fiscalAuthorization';

describe('fiscal operation role policy', () => {
  it.each(['seller', 'manager', 'administrator'])('allows %s', (role) => {
    expect(hasFiscalOperationRole({ role })).toBe(true);
  });

  it('allows an operator role stored in the multi-role field', () => {
    expect(hasFiscalOperationRole({ role: 'accountant', roles: ['accountant', 'seller'] })).toBe(
      true
    );
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

describe('autorização fiscal no backend', () => {
  it('recusa chamada sem token antes de consultar o banco', async () => {
    const getUser = vi.fn();
    const result = await authorizeFiscalOperator({ auth: { getUser } } as any, undefined);
    expect(result).toMatchObject({ ok: false, status: 401 });
    expect(getUser).not.toHaveBeenCalled();
  });
  it.each([
    ['stockist', false],
    ['seller', true],
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
    if (ok) expect(result).toMatchObject({ userId: 'operator' });
    else expect(result).toMatchObject({ status: 403 });
  });
});
