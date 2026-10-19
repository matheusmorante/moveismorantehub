import { useState, useEffect, useRef, useCallback } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from '@/pages/utils/supabaseConfig';
import { shouldRunAuthSessionMaintenance } from '../../../../shared-utils/authSessionPolicy';
import { withTimeout } from '../../../../shared-utils/withTimeout';
import { waitForAuthOperation } from '../../../../shared-utils/authOperationTimeout';
import {
  bindTestArtifactContext,
  clearTestArtifactContext,
  getTestArtifactContext,
  testArtifactIdentityForAuthenticatedUser,
} from '../../../../shared-utils/testArtifactContext';
import { queryClient } from '@/lib/queryClient';
import { verifyConfiguredTestArtifactOperator } from '@/services/testArtifactOperator';
import type { Profile, UserRole, PasswordCredentialStatus } from './auth.types';
import { fetchUserProfile } from './profileService';
import { isMasterEmail } from './masterIdentity';

export interface UseAuthSessionProps {
  setPasswordCredentialStatus: (status: PasswordCredentialStatus) => void;
  refreshPasswordCredentialStatus: () => Promise<boolean>;
  resetPasswordCredentialStatus: () => void;
  resetRoleMode: () => void;
}

export interface AuthSessionState {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  logout: () => Promise<void>;
}

/**
 * Custom hook managing the authentication session lifecycle:
 * - Supabase getSession & onAuthStateChange
 * - Mobile direct authentication via URL search parameters
 * - URL access_token hash extraction
 * - Resilient profile loading and synchronization
 * - Test artifact execution binding for operators
 * - Failsafe unblocking timer
 * - ReactNativeWebView postMessage bridge
 * - Safe signOut / logout
 */
export function useAuthSession({
  setPasswordCredentialStatus,
  refreshPasswordCredentialStatus,
  resetPasswordCredentialStatus,
  resetRoleMode,
}: UseAuthSessionProps): AuthSessionState {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const profileResolvedUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    let active = true;
    let handlingSession = false;
    let initialSessionUserId: string | null | undefined;
    const isDev = import.meta.env.DEV;

    if (isDev) console.log('[Auth] Initializing in DEVELOPMENT mode');
    else console.log('[Auth] Initializing in PRODUCTION mode');

    // Hard failsafe: if onAuthStateChange never fires, unblock after 5s
    const failsafe = setTimeout(() => {
      if (active) {
        console.warn('[Auth] 5s failsafe - onAuthStateChange never fired, setting loading=false');
        setLoading(false);
      }
    }, 5000);

    const handleSession = async (session: any, source: string) => {
      if (!active) return;
      const isInitialSessionSource = source === 'getSession' || source === 'INITIAL_SESSION';
      const sessionUserId = session?.user?.id ?? null;
      if (isInitialSessionSource && initialSessionUserId === sessionUserId) return;
      const runSessionMaintenance = shouldRunAuthSessionMaintenance(source);

      // Evitar chamadas duplicadas paralelas (getSession + onAuthStateChange)
      if (handlingSession) {
        console.log('[Auth] Skipping duplicate handleSession from:', source);
        return;
      }
      handlingSession = true;

      const newUser = session?.user || null;
      if (newUser && initialSessionUserId && initialSessionUserId !== sessionUserId) {
        try {
          queryClient.clear();
        } catch (e) {
          console.warn('[Auth] Falha ao limpar cache de queries na troca de usuário:', e);
        }
      }

      const previousTestContext = getTestArtifactContext();
      clearTestArtifactContext();

      if (newUser && profileResolvedUserIdRef.current !== newUser.id) {
        setProfile(null);
        setLoading(true);
      }
      if (!newUser) profileResolvedUserIdRef.current = null;
      setUser(newUser);

      if (newUser) {
        if (runSessionMaintenance) setPasswordCredentialStatus('checking');

        // Cleanup URL hash
        if (window.location.hash.includes('access_token=')) {
          window.history.replaceState(null, '', window.location.pathname + window.location.search);
        }

        try {
          const resolvedProfile = await fetchUserProfile({
            user: newUser,
            syncEmployee: runSessionMaintenance,
          });

          if (resolvedProfile) {
            profileResolvedUserIdRef.current = newUser.id;
            setProfile(resolvedProfile);
          } else {
            setProfile(null);
          }

          const isProfileAdministrator =
            resolvedProfile?.role === 'administrator' ||
            resolvedProfile?.roles?.includes('administrator') === true;

          const configuredOperatorAuthorized =
            import.meta.env.DEV && isProfileAdministrator
              ? await verifyConfiguredTestArtifactOperator(session?.access_token)
              : false;

          const ownedTestContext =
            previousTestContext?.ownerId === newUser.id ? previousTestContext : null;

          const testIdentity = testArtifactIdentityForAuthenticatedUser({
            isDevelopment: import.meta.env.DEV,
            runId:
              import.meta.env.VITE_TEST_ARTIFACT_RUN_ID ||
              ownedTestContext?.runId ||
              (configuredOperatorAuthorized ? crypto.randomUUID() : undefined),
            scenarioKey:
              import.meta.env.VITE_TEST_ARTIFACT_SCENARIO_KEY ||
              (!import.meta.env.VITE_TEST_ARTIFACT_RUN_ID ? ownedTestContext?.scenarioKey : undefined),
            ownerId: newUser.id,
            isAdministrator: isProfileAdministrator,
            configuredOperatorAuthorized,
          });

          if (testIdentity) bindTestArtifactContext(testIdentity);
          else clearTestArtifactContext();

          if (runSessionMaintenance) {
            try {
              await withTimeout(
                refreshPasswordCredentialStatus(),
                4000,
                false,
                'refreshPasswordCredentialStatus'
              );
            } catch (error) {
              console.error('[Auth] Não foi possível confirmar a credencial de senha:', error);
            }
          }
        } finally {
          clearTimeout(failsafe);
          if (isInitialSessionSource) initialSessionUserId = sessionUserId;
          if (active) setLoading(false);
          handlingSession = false;
        }
      } else {
        clearTimeout(failsafe);
        clearTestArtifactContext();
        try {
          queryClient.clear();
        } catch (e) {
          console.warn('[Auth] Falha ao limpar cache de queries na perda de sessão:', e);
        }
        if (isInitialSessionSource) initialSessionUserId = sessionUserId;
        resetPasswordCredentialStatus();

        const searchParams = new URLSearchParams(window.location.search);
        if (searchParams.get('auth_email') && searchParams.get('user_id')) {
          if (active) setLoading(false);
          handlingSession = false;
          return;
        }

        setProfile(null);
        setLoading(false);
        handlingSession = false;
      }
    };

    // 1. Verificar sessão inicial (para OAuth redirects, WebView hash de tokens, URL params móveis e localStorage)
    const initSession = async () => {
      if (!active) return;

      // Se o app mobile passou parâmetros de autenticação direta via URL (auth_email / user_id)
      const searchParams = new URLSearchParams(window.location.search);
      const authEmail = searchParams.get('auth_email');
      const authUserId = searchParams.get('user_id');
      const authRole = (searchParams.get('auth_role') as UserRole) || 'administrator';

      if (authEmail && authUserId) {
        clearTestArtifactContext();
        console.log('[Auth] Autenticação direta mobile ativada via URL para:', authEmail);
        const isMaster = isMasterEmail(authEmail);
        const finalRole = isMaster ? 'administrator' : authRole;

        const syntheticUser = {
          id: authUserId,
          email: authEmail,
          user_metadata: { full_name: isMaster ? 'Matheus Morante' : authEmail.split('@')[0] },
          app_metadata: {},
          aud: 'authenticated',
          created_at: new Date().toISOString(),
        } as any;

        setUser(syntheticUser);
        profileResolvedUserIdRef.current = authUserId;
        setProfile({
          id: authUserId,
          email: authEmail,
          role: finalRole,
          roles: [finalRole],
          full_name: isMaster ? 'Matheus Morante' : authEmail.split('@')[0],
        });
        clearTimeout(failsafe);
        setLoading(false);
        return;
      }

      // Se a URL contiver hash com access_token de autenticação direta, estabelece a sessão imediatamente
      if (window.location.hash.includes('access_token=')) {
        try {
          const hashStr = window.location.hash.substring(1);
          const params = new URLSearchParams(hashStr);
          const accessToken = params.get('access_token');
          const refreshToken = params.get('refresh_token');
          if (accessToken && refreshToken) {
            const { data: sData } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });
            if (sData?.session) {
              await handleSession(sData.session, 'hashDirectSession');
              return;
            }
          }
        } catch (err) {
          console.warn('[Auth] Erro ao extrair hash de sessão:', err);
        }
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (active && session) {
        console.log('[Auth] Initial session found');
        await handleSession(session, 'getSession');
      } else if (active && !session) {
        clearTestArtifactContext();
        clearTimeout(failsafe);
        setLoading(false);
      }
    };

    initSession();

    // 2. Ouvir mudanças de estado (INITIAL_SESSION, SIGNED_IN, TOKEN_REFRESHED, etc.)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!active) return;
      console.log('[Auth] State Change:', event);
      handleSession(session, event);
    });

    return () => {
      active = false;
      clearTestArtifactContext();
      clearTimeout(failsafe);
      subscription.unsubscribe();
    };
  }, [refreshPasswordCredentialStatus, resetPasswordCredentialStatus, setPasswordCredentialStatus]);

  useEffect(() => {
    if (profile) {
      (window as any).userProfile = profile;
      if ((window as any).ReactNativeWebView) {
        (window as any).ReactNativeWebView.postMessage(
          JSON.stringify({
            type: 'USER_PROFILE',
            profile,
          })
        );
      }
    } else {
      (window as any).userProfile = null;
    }
  }, [profile]);

  const logout = useCallback(async () => {
    try {
      queryClient.clear();
    } catch (e) {
      console.warn('[Auth] Falha ao limpar cache de queries no logout:', e);
    }
    const { error } = await waitForAuthOperation(supabase.auth.signOut(), 'auth:sair');
    if (error) throw new Error(error.message);
    clearTestArtifactContext();
    profileResolvedUserIdRef.current = null;
    setUser(null);
    setProfile(null);
    resetRoleMode();
    resetPasswordCredentialStatus();
  }, [resetPasswordCredentialStatus, resetRoleMode]);

  return {
    user,
    profile,
    loading,
    logout,
  };
}
