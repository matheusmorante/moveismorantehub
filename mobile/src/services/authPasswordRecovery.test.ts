import { describe, expect, it, vi } from 'vitest';
import {
  getPasswordAuthErrorMessage,
  isPasswordReauthenticationRequired,
  requestPasswordChangeReauthentication,
  requestPasswordRecoveryCode,
  updateAuthenticatedPassword,
  verifyPasswordRecoveryCode,
  type PasswordRecoveryClient,
} from './authPasswordRecovery';

const createClient = () => {
  const resetPasswordForEmail = vi.fn().mockResolvedValue({ error: null });
  const verifyOtp = vi.fn().mockResolvedValue({
    data: { user: { id: 'auth-user-1' }, session: { access_token: 'session' } },
    error: null,
  });
  const updateUser = vi.fn().mockResolvedValue({ data: { user: { id: 'auth-user-1' } }, error: null });
  const reauthenticate = vi.fn().mockResolvedValue({ error: null });
  const client = {
    auth: { resetPasswordForEmail, verifyOtp, updateUser, reauthenticate },
  } as unknown as PasswordRecoveryClient;
  return { client, resetPasswordForEmail, verifyOtp, updateUser, reauthenticate };
};

describe('authPasswordRecovery mobile', () => {
  it('solicita recuperação pelo Supabase sem criar usuário nem revelar sua existência', async () => {
    const { client, resetPasswordForEmail } = createClient();
    await expect(requestPasswordRecoveryCode(client, '  pessoa@example.invalid  ')).resolves.toEqual({
      error: null,
    });
    expect(resetPasswordForEmail).toHaveBeenCalledWith('pessoa@example.invalid');
    expect(client.auth).not.toHaveProperty('signUp');
  });

  it('valida o código com OTP oficial do tipo recovery', async () => {
    const { client, verifyOtp } = createClient();
    await verifyPasswordRecoveryCode(client, ' pessoa@example.invalid ', ' 123456 ');
    expect(verifyOtp).toHaveBeenCalledWith({
      email: 'pessoa@example.invalid',
      token: '123456',
      type: 'recovery',
    });
  });

  it('repete a solicitação de recovery no Supabase para reenvio e preserva rate limit nativo', async () => {
    const { client, resetPasswordForEmail } = createClient();
    await requestPasswordRecoveryCode(client, 'pessoa@example.invalid');
    await requestPasswordRecoveryCode(client, 'pessoa@example.invalid');
    expect(resetPasswordForEmail).toHaveBeenCalledTimes(2);
  });

  it('distingue código expirado, inválido e limite de envio pelos erros oficiais do Auth', () => {
    expect(getPasswordAuthErrorMessage({ code: 'otp_expired' }, 'recovery-verify')).toContain(
      'expirou'
    );
    expect(getPasswordAuthErrorMessage({ code: 'bad_code' }, 'recovery-verify')).toContain(
      'inválido'
    );
    expect(getPasswordAuthErrorMessage({ status: 429 }, 'recovery-send')).toContain('Aguarde');
  });

  it('altera a senha da sessão atual e usa nonce quando o Auth exigir reautenticação', async () => {
    const { client, updateUser, reauthenticate } = createClient();
    await requestPasswordChangeReauthentication(client);
    await updateAuthenticatedPassword(client, 'senha-segura-123', ' 654321 ');

    expect(reauthenticate).toHaveBeenCalledTimes(1);
    expect(updateUser).toHaveBeenCalledWith({ password: 'senha-segura-123', nonce: '654321' });
    expect(client.auth).not.toHaveProperty('signUp');
  });

  it('detecta a exigência de reautenticação sem exibir mensagens brutas do servidor', () => {
    const error = { code: 'reauthentication_needed', message: 'reauthentication required' };
    expect(isPasswordReauthenticationRequired(error)).toBe(true);
    expect(getPasswordAuthErrorMessage({ code: 'weak_password' }, 'password-update')).toContain(
      'requisitos'
    );
  });
});
