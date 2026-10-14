import { passwordSetupFormSchema } from '../../../shared-utils/authFormSchemas';
export { PASSWORD_SETUP_MIN_LENGTH } from '../../../shared-utils/authFormSchemas';

export type PasswordSetupClient = {
  auth: {
    updateUser: (attributes: { password: string }) => PromiseLike<{
      data: { user: { id: string } | null };
      error: { message: string } | null;
    }>;
    signInWithPassword: (credentials: { email: string; password: string }) => PromiseLike<{
      data: { session: { user: { id: string } } | null };
      error: { message: string } | null;
    }>;
    signInWithOAuth: (credentials: {
      provider: 'google';
      options: { redirectTo?: string; skipBrowserRedirect?: boolean };
    }) => PromiseLike<{
      data: { url?: string | null };
      error: { message: string } | null;
    }>;
  };
  rpc: (functionName: 'current_user_has_password') => PromiseLike<{
    data: unknown;
    error: { message: string } | null;
  }>;
};

export const validatePasswordSetup = (password: string, confirmation: string) => {
  const result = passwordSetupFormSchema.safeParse({ password, confirmation });
  return result.success ? null : result.error.issues[0].message;
};

export const checkCurrentUserHasPassword = async (client: PasswordSetupClient) => {
  const { data, error } = await client.rpc('current_user_has_password');
  if (error) throw error;
  if (typeof data !== 'boolean') {
    throw new Error('O Supabase retornou um estado de senha inválido.');
  }
  return data;
};

export const createCurrentUserPassword = async (
  client: PasswordSetupClient,
  password: string,
  confirmation: string
) => {
  const validationError = validatePasswordSetup(password, confirmation);
  if (validationError) throw new Error(validationError);

  const { data, error } = await client.auth.updateUser({ password });
  if (error) throw error;
  return data.user;
};

export const signInWithEmailPassword = (
  client: PasswordSetupClient,
  email: string,
  password: string
) => client.auth.signInWithPassword({ email: email.trim(), password });

export const signInWithGoogle = (
  client: PasswordSetupClient,
  options: { redirectTo?: string; skipBrowserRedirect?: boolean }
) => client.auth.signInWithOAuth({ provider: 'google', options });
