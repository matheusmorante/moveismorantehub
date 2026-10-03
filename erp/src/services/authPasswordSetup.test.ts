import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  checkCurrentUserHasPassword,
  createCurrentUserPassword,
  signInWithEmailPassword,
  signInWithGoogle,
  validatePasswordSetup,
  type PasswordSetupClient,
} from './authPasswordSetup';

const createAuthClient = () => {
  const updateUser = vi.fn().mockResolvedValue({
    data: { user: { id: 'auth-user-1' } },
    error: null,
  });
  const signInWithPassword = vi.fn().mockResolvedValue({
    data: { user: { id: 'auth-user-1' }, session: { user: { id: 'auth-user-1' } } },
    error: null,
  });
  const signInWithOAuth = vi
    .fn()
    .mockResolvedValue({ data: { url: 'https://google.test' }, error: null });
  const rpc = vi.fn().mockResolvedValue({ data: false, error: null });
  const client = {
    auth: { updateUser, signInWithPassword, signInWithOAuth },
    rpc,
  } as unknown as PasswordSetupClient;

  return { client, updateUser, signInWithPassword, signInWithOAuth, rpc };
};

describe('authPasswordSetup', () => {
  let mocks: ReturnType<typeof createAuthClient>;

  beforeEach(() => {
    mocks = createAuthClient();
  });

  it('configura uma senha para uma conta recém-criada pelo Google na mesma identidade Auth', async () => {
    expect(await checkCurrentUserHasPassword(mocks.client)).toBe(false);
    const user = await createCurrentUserPassword(
      mocks.client,
      'senha-segura-123',
      'senha-segura-123'
    );

    expect(user?.id).toBe('auth-user-1');
    expect(mocks.updateUser).toHaveBeenCalledWith({ password: 'senha-segura-123' });
  });

  it('identifica uma conta Google antiga sem credencial de senha', async () => {
    mocks.rpc.mockResolvedValueOnce({ data: false, error: null });

    await expect(checkCurrentUserHasPassword(mocks.client)).resolves.toBe(false);
    expect(mocks.rpc).toHaveBeenCalledWith('current_user_has_password');
  });

  it('reconhece uma conta que já possui senha', async () => {
    mocks.rpc.mockResolvedValueOnce({ data: true, error: null });

    await expect(checkCurrentUserHasPassword(mocks.client)).resolves.toBe(true);
    expect(mocks.updateUser).not.toHaveBeenCalled();
  });

  it('permite login manual com a senha recém-configurada', async () => {
    const user = await createCurrentUserPassword(
      mocks.client,
      'senha-segura-123',
      'senha-segura-123'
    );
    const { data } = await signInWithEmailPassword(
      mocks.client,
      '  pessoa@morantehub.com  ',
      'senha-segura-123'
    );

    expect(data.session?.user.id).toBe(user?.id);
    expect(mocks.signInWithPassword).toHaveBeenCalledWith({
      email: 'pessoa@morantehub.com',
      password: 'senha-segura-123',
    });
  });

  it('mantém o login Google pelo provedor Supabase Auth', async () => {
    await signInWithGoogle(mocks.client, { redirectTo: 'https://morantehub.test' });

    expect(mocks.signInWithOAuth).toHaveBeenCalledWith({
      provider: 'google',
      options: { redirectTo: 'https://morantehub.test' },
    });
  });

  it('rejeita senha curta ou confirmação diferente antes de chamar o Supabase', async () => {
    expect(validatePasswordSetup('curta', 'curta')).toContain('8 caracteres');
    expect(validatePasswordSetup('senha-segura-123', 'outra-senha-123')).toBe(
      'As senhas não coincidem.'
    );
    await expect(
      createCurrentUserPassword(mocks.client, 'senha-segura-123', 'outra-senha-123')
    ).rejects.toThrow('As senhas não coincidem.');
    expect(mocks.updateUser).not.toHaveBeenCalled();
  });

  it('não cria usuário ou perfil duplicado ao adicionar senha à identidade atual', async () => {
    const user = await createCurrentUserPassword(
      mocks.client,
      'senha-segura-123',
      'senha-segura-123'
    );
    const auth = mocks.client.auth as unknown as { signUp?: unknown };

    expect(user?.id).toBe('auth-user-1');
    expect(mocks.updateUser).toHaveBeenCalledTimes(1);
    expect(auth.signUp).toBeUndefined();
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it('preserva cargo e permissões porque a configuração só atualiza Supabase Auth', async () => {
    const profile = Object.freeze({
      id: 'auth-user-1',
      role: 'manager',
      roles: Object.freeze(['manager', 'seller']),
      permissions: Object.freeze({ manualStockMovement: true }),
    });

    await createCurrentUserPassword(mocks.client, 'senha-segura-123', 'senha-segura-123');

    expect(profile).toEqual({
      id: 'auth-user-1',
      role: 'manager',
      roles: ['manager', 'seller'],
      permissions: { manualStockMovement: true },
    });
    expect(mocks.updateUser).toHaveBeenCalledTimes(1);
  });
});
