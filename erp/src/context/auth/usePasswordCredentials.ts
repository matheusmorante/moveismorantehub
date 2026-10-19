import { useState, useCallback } from 'react';
import { supabase } from '@/pages/utils/supabaseConfig';
import {
  checkCurrentUserHasPassword,
  createCurrentUserPassword,
} from '@/services/authPasswordSetup';
import type { PasswordCredentialStatus } from './auth.types';

export interface PasswordCredentialsManager {
  passwordCredentialStatus: PasswordCredentialStatus;
  setPasswordCredentialStatus: React.Dispatch<React.SetStateAction<PasswordCredentialStatus>>;
  refreshPasswordCredentialStatus: () => Promise<boolean>;
  createPasswordCredential: (password: string, confirmation: string) => Promise<void>;
  resetPasswordCredentialStatus: () => void;
}

/**
 * Custom hook to manage the user's password credential state,
 * checks if password exists on Supabase auth, and handles password creation.
 */
export function usePasswordCredentials(): PasswordCredentialsManager {
  const [passwordCredentialStatus, setPasswordCredentialStatus] =
    useState<PasswordCredentialStatus>('idle');

  const refreshPasswordCredentialStatus = useCallback(async () => {
    setPasswordCredentialStatus('checking');
    try {
      const hasPassword = await checkCurrentUserHasPassword(supabase);
      setPasswordCredentialStatus(hasPassword ? 'configured' : 'required');
      return hasPassword;
    } catch (error) {
      setPasswordCredentialStatus('error');
      throw error;
    }
  }, []);

  const createPasswordCredential = useCallback(
    async (password: string, confirmation: string) => {
      await createCurrentUserPassword(supabase, password, confirmation);
      const hasPassword = await refreshPasswordCredentialStatus();
      if (!hasPassword) {
        throw new Error('O Supabase ainda não confirmou a senha. Tente novamente.');
      }
    },
    [refreshPasswordCredentialStatus]
  );

  const resetPasswordCredentialStatus = useCallback(() => {
    setPasswordCredentialStatus('idle');
  }, []);

  return {
    passwordCredentialStatus,
    setPasswordCredentialStatus,
    refreshPasswordCredentialStatus,
    createPasswordCredential,
    resetPasswordCredentialStatus,
  };
}
