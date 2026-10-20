import { useState } from 'react';
import { supabase } from '../../services/supabaseClient';
import {
  checkCurrentUserHasPassword,
  createCurrentUserPassword,
} from '../../services/authPasswordSetup';

export type PasswordCredentialStatus = 'idle' | 'checking' | 'required' | 'configured' | 'error';

const PASSWORD_CHECK_TIMEOUT_MS = 5000;

const withPasswordCheckTimeout = <T,>(promise: Promise<T>): Promise<T> =>
  Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(
        () => reject(new Error('Timeout ao verificar credencial de senha offline.')),
        PASSWORD_CHECK_TIMEOUT_MS
      )
    ),
  ]);

export const usePasswordCredentialState = () => {
  const [passwordCredentialStatus, setPasswordCredentialStatus] =
    useState<PasswordCredentialStatus>('idle');
  const [passwordRecoveryInProgress, setPasswordRecoveryInProgress] = useState(false);

  const beginPasswordRecovery = () => setPasswordRecoveryInProgress(true);
  const endPasswordRecovery = () => setPasswordRecoveryInProgress(false);

  const refreshPasswordCredentialStatus = async () => {
    setPasswordCredentialStatus('checking');
    try {
      const hasPassword = await withPasswordCheckTimeout(checkCurrentUserHasPassword(supabase));
      setPasswordCredentialStatus(hasPassword ? 'configured' : 'required');
      return hasPassword;
    } catch (error) {
      setPasswordCredentialStatus('error');
      throw error;
    }
  };

  const createPasswordCredential = async (password: string, confirmation: string) => {
    await createCurrentUserPassword(supabase, password, confirmation);
    const hasPassword = await refreshPasswordCredentialStatus();
    if (!hasPassword) {
      throw new Error('O Supabase ainda não confirmou a senha. Tente novamente.');
    }
  };

  const resetPasswordCredentialState = () => {
    setPasswordCredentialStatus('idle');
    setPasswordRecoveryInProgress(false);
  };

  return {
    passwordCredentialStatus,
    setPasswordCredentialStatus,
    passwordRecoveryInProgress,
    beginPasswordRecovery,
    endPasswordRecovery,
    refreshPasswordCredentialStatus,
    createPasswordCredential,
    resetPasswordCredentialState,
  };
};
