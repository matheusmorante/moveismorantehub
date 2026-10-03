export type PasswordAuthError = {
  code?: string;
  message?: string;
  status?: number;
};

export type PasswordRecoveryClient = {
  auth: {
    resetPasswordForEmail: (email: string) => PromiseLike<{ error: PasswordAuthError | null }>;
    verifyOtp: (credentials: { email: string; token: string; type: 'recovery' }) => PromiseLike<{
      data: { user: { id: string } | null; session: unknown | null };
      error: PasswordAuthError | null;
    }>;
    updateUser: (attributes: {
      password: string;
      nonce?: string;
      current_password?: string;
    }) => PromiseLike<{
      data: { user: { id: string } | null };
      error: PasswordAuthError | null;
    }>;
    reauthenticate: () => PromiseLike<{ error: PasswordAuthError | null }>;
  };
};

type PasswordAuthErrorContext =
  | 'recovery-send'
  | 'recovery-verify'
  | 'password-update'
  | 'reauth-send';

const errorCode = (error: PasswordAuthError) => error.code?.toLowerCase() ?? '';
const errorMessage = (error: PasswordAuthError) => error.message?.toLowerCase() ?? '';

const isRateLimitError = (error: PasswordAuthError) => {
  const code = errorCode(error);
  const message = errorMessage(error);
  return (
    error.status === 429 ||
    code.includes('rate_limit') ||
    code.includes('too_many') ||
    message.includes('rate limit') ||
    message.includes('too many requests')
  );
};

export const isPasswordReauthenticationRequired = (error: PasswordAuthError) =>
  ['reauthentication_needed', 'reauthentication_required'].includes(errorCode(error)) ||
  /reauthentication.*(required|needed)|recently.*authenticated/i.test(error.message ?? '');

export const isCurrentPasswordRequired = (error: PasswordAuthError) =>
  ['current_password_required', 'current_password_needed'].includes(errorCode(error)) ||
  /current password.*(required|needed)|provide.*current password/i.test(error.message ?? '');

export const requestPasswordRecoveryCode = (client: PasswordRecoveryClient, email: string) =>
  client.auth.resetPasswordForEmail(email.trim());

export const verifyPasswordRecoveryCode = (
  client: PasswordRecoveryClient,
  email: string,
  token: string
) =>
  client.auth.verifyOtp({
    email: email.trim(),
    token: token.trim(),
    type: 'recovery',
  });

export const requestPasswordChangeReauthentication = (client: PasswordRecoveryClient) =>
  client.auth.reauthenticate();

export const updateAuthenticatedPassword = (
  client: PasswordRecoveryClient,
  password: string,
  nonce?: string,
  currentPassword?: string
) =>
  client.auth.updateUser({
    password,
    ...(nonce ? { nonce: nonce.trim() } : {}),
    ...(currentPassword ? { current_password: currentPassword } : {}),
  });

export const getPasswordAuthErrorMessage = (
  error: PasswordAuthError,
  context: PasswordAuthErrorContext
) => {
  if (isRateLimitError(error)) {
    return 'Aguarde um pouco antes de tentar novamente.';
  }

  const code = errorCode(error);
  const message = errorMessage(error);

  if (context === 'recovery-send') {
    return 'Não foi possível enviar o código agora. Tente novamente mais tarde.';
  }

  if (context === 'reauth-send') {
    return 'Não foi possível enviar o código de confirmação agora. Tente novamente mais tarde.';
  }

  if (context === 'recovery-verify') {
    if (code === 'otp_expired' || (message.includes('expired') && !message.includes('invalid'))) {
      return 'O código expirou. Solicite um novo código.';
    }
    return 'Código inválido. Confira e tente novamente.';
  }

  if (
    code === 'weak_password' ||
    message.includes('weak password') ||
    message.includes('password does not meet')
  ) {
    return 'Senha fora dos requisitos definidos pelo sistema.';
  }

  return 'Não foi possível atualizar a senha. Confira os dados e tente novamente.';
};
