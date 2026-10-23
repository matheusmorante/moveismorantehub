import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { authenticateErpRequest, hasErpPermission } from '../../../../api/_lib/authenticatedErpRequest';

const { createClient } = vi.hoisted(() => ({ createClient: vi.fn() }));
vi.mock('@supabase/supabase-js', () => ({ createClient }));

function setup(profile: unknown) {
  const maybeSingle = vi.fn()
    .mockResolvedValueOnce({ data: profile, error: null })
    .mockResolvedValueOnce({ data: { rolePermissions: {} }, error: null });
  const query = { select: vi.fn(), eq: vi.fn(), maybeSingle };
  query.select.mockReturnValue(query);
  query.eq.mockReturnValue(query);
  const db = {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'operator' } }, error: null }) },
    from: vi.fn().mockReturnValue(query),
  };
  createClient.mockReturnValue(db);
  const response = { status: vi.fn(), json: vi.fn() };
  response.status.mockReturnValue(response);
  response.json.mockReturnValue(response);
  return { db, response, res: response as unknown as VercelResponse };
}

describe('autenticação das integrações seguras — papéis persistidos', () => {
  beforeEach(() => {
    vi.stubEnv('SUPABASE_URL', 'https://project.example');
    vi.stubEnv('SUPABASE_ANON_KEY', 'public-test-key');
  });
  afterEach(() => vi.unstubAllEnvs());

  it.each([
    [{ role: 'pending', roles: ['administrator'] }, ['administrator'], true],
    [{ role: 'administrator', roles: ['seller'] }, ['seller'], false],
    [{ role: 'pending', roles: ['pending', 'seller'] }, ['seller'], false],
    [{ role: 'manager', roles: [] }, ['manager'], false],
    [{ role: 'administrator', roles: null }, ['administrator'], true],
    [{ role: 'manager', roles: ['pending', null, '', ' '] }, ['manager'], false],
  ])('resolve %j sem unir o campo legado aos papéis atuais', async (profile, roles, managesSettings) => {
    const { db, response, res } = setup(profile);
    const context = await authenticateErpRequest({ headers: { authorization: 'Bearer unit-session' } } as VercelRequest, res);
    expect(db.auth.getUser).toHaveBeenCalledWith('unit-session');
    expect(context?.roles).toEqual(roles);
    expect(hasErpPermission(context!, 'manageSettings')).toBe(managesSettings);
    expect(response.status).not.toHaveBeenCalled();
  });

  it.each([null, { role: 'pending', roles: [] }, { role: 'pending', roles: ['pending'] }])(
    'recusa perfil sem papel efetivo: %j', async (profile) => {
      const { db, response, res } = setup(profile);
      expect(await authenticateErpRequest({ headers: { authorization: 'Bearer unit-session' } } as VercelRequest, res)).toBeNull();
      expect(response.status).toHaveBeenCalledWith(403);
      expect(db.from).toHaveBeenCalledTimes(1);
    }
  );

  it('recusa JWT inválido antes de consultar perfis e permissões', async () => {
    const { db, response, res } = setup({ role: 'pending', roles: ['administrator'] });
    db.auth.getUser.mockResolvedValue({ data: { user: null }, error: new Error('invalid session') });
    expect(await authenticateErpRequest({ headers: { authorization: 'Bearer expired-session' } } as VercelRequest, res)).toBeNull();
    expect(response.status).toHaveBeenCalledWith(401);
    expect(db.from).not.toHaveBeenCalled();
  });
});
