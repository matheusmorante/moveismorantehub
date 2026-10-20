import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Platform } from 'react-native';
import * as Linking from 'expo-linking';
import { supabase } from '../services/supabaseClient';
import { completeGoogleSignIn } from '../services/googleAuth';
import { resolveMobileUserProfile } from '../services/mobileAuthProfile';
import { offlineSyncManager } from '../services/offline/offlineSyncManager';
import { shouldRunAuthSessionMaintenance } from '../../../shared-utils/authSessionPolicy';
import {
  deriveAuthRoleFlags,
  resolveWebDevOverrideProfile,
} from './auth/authProfilePermissions';
import { useRolePermissionsState } from './auth/useRolePermissionsState';
import {
  usePasswordCredentialState,
  type PasswordCredentialStatus,
} from './auth/usePasswordCredentialState';

export type { PasswordCredentialStatus };

interface AuthContextProps {
  userProfile: any;
  setUserProfile: React.Dispatch<React.SetStateAction<any>>;
  loadingProfile: boolean;
  handleLogout: () => Promise<void>;
  isAdmin: boolean;
  isAssemblerDriver: boolean;
  isSeller: boolean;
  canSeeReports: boolean;
  canSeeProducts: boolean;
  canUseProductPermission: (actionId: string) => boolean;
  rolePermissions: Record<string, string[]>;
  rolePermissionsLoaded: boolean;
  rolePermissionsLoadFailed: boolean;
  reloadRolePermissions: () => void;
  saveRolePermissions: (updates: Record<string, string[]>) => Promise<void>;
  canSeeFinance: boolean;
  canManageStock: boolean;
  passwordCredentialStatus: PasswordCredentialStatus;
  passwordRecoveryInProgress: boolean;
  refreshPasswordCredentialStatus: () => Promise<boolean>;
  createPasswordCredential: (password: string, confirmation: string) => Promise<void>;
  beginPasswordRecovery: () => void;
  endPasswordRecovery: () => void;
}

const AuthContext = createContext<AuthContextProps | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [userProfile, setUserProfile] = useState<any>(() => resolveWebDevOverrideProfile());
  const [loadingProfile, setLoadingProfile] = useState(() => !resolveWebDevOverrideProfile());

  const {
    passwordCredentialStatus,
    setPasswordCredentialStatus,
    passwordRecoveryInProgress,
    beginPasswordRecovery,
    endPasswordRecovery,
    refreshPasswordCredentialStatus,
    createPasswordCredential,
    resetPasswordCredentialState,
  } = usePasswordCredentialState();

  const profileAccessKey = userProfile?.id || userProfile?.email || null;
  const {
    rolePermissions,
    rolePermissionsLoaded,
    rolePermissionsLoadFailed,
    reloadRolePermissions,
    saveRolePermissions,
  } = useRolePermissionsState(profileAccessKey);

  const handleLogout = async () => {
    try {
      offlineSyncManager.setCurrentUserId(null);
      await supabase.auth.signOut();
      setUserProfile(null);
      resetPasswordCredentialState();
    } catch (err) {
      console.warn('[Logout] Erro:', err);
    }
  };

  const syncAuthProfile = async (session: any, checkPasswordCredential = true) => {
    offlineSyncManager.setCurrentUserId(session?.user?.id ?? null);
    const webDevOverride = resolveWebDevOverrideProfile();
    if (webDevOverride) {
      setUserProfile(webDevOverride);
      setPasswordCredentialStatus('idle');
      setLoadingProfile(false);
      return;
    }

    setLoadingProfile(true);
    try {
      setUserProfile(await resolveMobileUserProfile(session));
    } catch (err) {
      console.warn('[AuthChange] Erro ao processar autenticação:', err);
      setUserProfile(null);
    }

    if (session?.user && checkPasswordCredential) {
      try {
        await refreshPasswordCredentialStatus();
      } catch (err) {
        console.warn('[AuthChange] Não foi possível confirmar a credencial de senha:', err);
      }
    } else {
      setPasswordCredentialStatus('idle');
    }
    setLoadingProfile(false);
  };

  const handleDeepLinkUrl = async (url: string) => {
    if (!url) return;
    try {
      if (!url.includes('code=') && !url.includes('access_token=') && !url.includes('error='))
        return;

      setLoadingProfile(true);
      const session = await completeGoogleSignIn(url);
      if (session) {
        console.log('[DeepLink] Sessão ativada com sucesso');
        if (Platform.OS === 'web' && typeof window !== 'undefined') {
          window.history.replaceState({}, document.title, window.location.pathname);
        }
      }
    } catch {
      console.warn('[DeepLink] Falha ao processar URL');
    } finally {
      setLoadingProfile(false);
    }
  };

  useEffect(() => {
    let initialAuthSyncStarted = false;
    const syncInitialAuthSessionOnce = (session: any) => {
      if (initialAuthSyncStarted) return;
      initialAuthSyncStarted = true;
      setPasswordCredentialStatus(session?.user ? 'checking' : 'idle');
      void syncAuthProfile(session, true);
    };

    const initialUrlPromise =
      Platform.OS === 'web' && typeof window !== 'undefined'
        ? Promise.resolve(window.location.href)
        : Linking.getInitialURL();
    initialUrlPromise.then((url) => {
      if (url) void handleDeepLinkUrl(url);
    });

    const deepLinkSubscription = Linking.addEventListener('url', (event) => {
      if (event.url) void handleDeepLinkUrl(event.url);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('[AuthChange] Event:', event);
      if (event === 'INITIAL_SESSION') {
        syncInitialAuthSessionOnce(session);
        return;
      }
      const runSessionMaintenance = shouldRunAuthSessionMaintenance(event);
      if (session?.user && runSessionMaintenance) setPasswordCredentialStatus('checking');
      else if (!session?.user) setPasswordCredentialStatus('idle');
      setTimeout(() => {
        void syncAuthProfile(session, runSessionMaintenance);
      }, 0);
    });

    const authTimeout = setTimeout(() => {
      setLoadingProfile(false);
    }, 3500);

    const webDevOverride = resolveWebDevOverrideProfile();
    if (webDevOverride) {
      clearTimeout(authTimeout);
      setUserProfile(webDevOverride);
      setPasswordCredentialStatus('idle');
      setLoadingProfile(false);
      return () => {
        subscription.unsubscribe();
        deepLinkSubscription.remove();
      };
    }

    supabase.auth
      .getSession()
      .then(({ data: { session } }) => {
        clearTimeout(authTimeout);
        syncInitialAuthSessionOnce(session);
      })
      .catch((err) => {
        clearTimeout(authTimeout);
        setLoadingProfile(false);
        console.warn('[Auth] Não foi possível carregar a sessão inicial:', err);
      });

    return () => {
      subscription.unsubscribe();
      deepLinkSubscription.remove();
    };
  }, []);

  const roleFlags = deriveAuthRoleFlags(userProfile, rolePermissions, rolePermissionsLoaded);

  return (
    <AuthContext.Provider
      value={{
        userProfile,
        setUserProfile,
        loadingProfile,
        handleLogout,
        ...roleFlags,
        rolePermissions,
        rolePermissionsLoaded,
        rolePermissionsLoadFailed,
        reloadRolePermissions,
        saveRolePermissions,
        passwordCredentialStatus,
        passwordRecoveryInProgress,
        refreshPasswordCredentialStatus,
        createPasswordCredential,
        beginPasswordRecovery,
        endPasswordRecovery,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
