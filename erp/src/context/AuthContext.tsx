import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/pages/utils/supabaseConfig';
import { User } from '@supabase/supabase-js';
import {
  checkCurrentUserHasPassword,
  createCurrentUserPassword,
} from '@/services/authPasswordSetup';
import { shouldRunAuthSessionMaintenance } from '../../../shared-utils/authSessionPolicy';
import {
  bindTestArtifactContext,
  clearTestArtifactContext,
  testArtifactIdentityForAuthenticatedUser,
} from '../../../shared-utils/testArtifactContext';
import { queryClient } from '@/lib/queryClient';

export type UserRole =
  | 'administrator'
  | 'deliverer'
  | 'seller'
  | 'accountant'
  | 'manager'
  | 'stockist'
  | 'pending';

export interface Profile {
  id: string;
  email: string;
  role: UserRole;
  roles?: UserRole[];
  full_name?: string;
  avatar_url?: string;
  position?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
}

const PROFILE_COLUMNS = 'id,email,role,roles,full_name,position,phone,address';

export type PasswordCredentialStatus = 'idle' | 'checking' | 'required' | 'configured' | 'error';

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  isAuthenticated: boolean;
  loading: boolean;
  isAdmin: boolean;
  isAdministrator: boolean;
  isManager: boolean;
  isRealAdministrator: boolean;
  activeRoleMode: UserRole | null;
  setActiveRoleMode: (role: UserRole | null) => void;
  isPending: boolean;
  passwordCredentialStatus: PasswordCredentialStatus;
  refreshPasswordCredentialStatus: () => Promise<boolean>;
  createPasswordCredential: (password: string, confirmation: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeRoleModeState, setActiveRoleModeState] = useState<UserRole | null>(null);
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

  const isRealAdministrator =
    profile?.role === 'administrator' || profile?.roles?.includes('administrator') === true;

  const setActiveRoleMode = useCallback(
    (role: UserRole | null) => {
      if (!isRealAdministrator) return;
      setActiveRoleModeState(role === 'pending' ? null : role);
    },
    [isRealAdministrator]
  );

  useEffect(() => {
    if (!isRealAdministrator) setActiveRoleModeState(null);
  }, [isRealAdministrator]);

  const isRoleModeActive = isRealAdministrator && activeRoleModeState !== null;
  const effectiveProfile = useMemo(() => {
    if (!profile || !isRoleModeActive || !activeRoleModeState) return profile;
    return { ...profile, role: activeRoleModeState, roles: [activeRoleModeState] };
  }, [profile, isRoleModeActive, activeRoleModeState]);
  const effectiveRoles = useMemo(
    () =>
      effectiveProfile?.roles?.length
        ? effectiveProfile.roles
        : effectiveProfile?.role
          ? [effectiveProfile.role]
          : [],
    [effectiveProfile]
  );

  const isMasterEmailCheck = (emailStr: string) => {
    const email = (emailStr || '').toLowerCase().trim();
    return (
      email === 'matheusmorante002@gmail.com' ||
      email === 'matheusmorante0002@gmail.com' ||
      email === 'matheusmroante0002@gmail.com' ||
      (email.includes('matheus') && email.includes('morante'))
    );
  };

  const fetchProfile = async (user: User, syncEmployee: boolean): Promise<Profile | null> => {
    try {
      console.log('[Auth] Fetching profile for:', user.id);
      const userEmail = (user.email || '').toLowerCase().trim();
      const isMasterEmail = isMasterEmailCheck(userEmail);
      const googleName = user.user_metadata?.full_name || user.user_metadata?.name;

      const { data: existingProfile } = await supabase
        .from('profiles')
        .select(PROFILE_COLUMNS)
        .eq('id', user.id)
        .maybeSingle();
      let data: Profile | null = existingProfile;

      if (!data) {
        console.log('[Auth] Perfil não encontrado no banco. Criando registro...');
        const assignedRole: UserRole = 'pending';
        const newProfile: Profile = {
          id: user.id,
          email: user.email || '',
          role: assignedRole,
          full_name:
            googleName ||
            user.email?.split('@')[0] ||
            (isMasterEmail ? 'Matheus Morante' : 'Novo Usuário'),
        };

        const { data: upsertedData } = await supabase
          .from('profiles')
          .upsert(newProfile)
          .select(PROFILE_COLUMNS)
          .maybeSingle();

        data = upsertedData || newProfile;
      }

      if (data && googleName && data.full_name !== googleName) {
        data.full_name = googleName;
        await supabase.from('profiles').update({ full_name: googleName }).eq('id', user.id);
      }

      // Garante que o usuário logado via Google sincronize seu colaborador na tabela people (1 por e-mail)
      if (userEmail && syncEmployee) {
        try {
          const { data: existingEmps } = await supabase
            .from('people')
            .select('id,email,full_name')
            .eq('person_type', 'employees')
            .eq('deleted', false)
            .ilike('email', userEmail)
            .limit(1);

          const empName =
            googleName ||
            data?.full_name ||
            userEmail.split('@')[0] ||
            (isMasterEmail ? 'Matheus Morante' : 'Colaborador');

          if (existingEmps && existingEmps.length > 0) {
            // Colaborador já existe com esse e-mail: atualiza suas informações pessoais do Google sem duplicar
            const primaryEmp = existingEmps[0];
            if (
              googleName &&
              (!primaryEmp.full_name || primaryEmp.full_name === userEmail.split('@')[0])
            ) {
              await supabase
                .from('people')
                .update({
                  full_name: empName,
                  updated_at: new Date().toISOString(),
                })
                .eq('id', primaryEmp.id);
            }
          } else {
            // Nenhum colaborador usa esse e-mail: cria exatamente 1 novo colaborador com as informações do Google
            console.log(
              '[Auth] Criando colaborador para novo usuário logado via Google:',
              userEmail
            );
            const defaultRole: UserRole = data?.role || 'pending';
            const defaultRoles: UserRole[] = data?.roles?.length ? data.roles : [defaultRole];

            await supabase.from('people').insert([
              {
                person_type: 'employees',
                person_type_pf_pj: 'PF',
                full_name: empName,
                email: user.email || '',
                position: data?.position || 'Sem Cargo Definido',
                active: true,
                is_draft: false,
                deleted: false,
                address: {
                  noAddress: true,
                  street: '',
                  city: '',
                  state: '',
                  cep: '',
                  role: defaultRole,
                  roles: defaultRoles,
                },
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              },
            ]);
          }
        } catch (empErr) {
          console.warn('[Auth] Aviso ao sincronizar colaborador para usuário:', empErr);
        }
      }

      const resolvedProfile = data as Profile;
      setProfile(resolvedProfile);
      return resolvedProfile;
    } catch (err) {
      console.error('[Auth] Error fetching profile:', err);
      const userEmail = (user.email || '').toLowerCase().trim();
      const isMasterEmail = isMasterEmailCheck(userEmail);

      const pendingProfile: Profile = {
        id: user.id,
        email: user.email || '',
        role: 'pending',
        full_name:
          user.user_metadata?.full_name || (isMasterEmail ? 'Matheus Morante' : 'Usuário Pendente'),
      };
      setProfile(pendingProfile);
      return pendingProfile;
    }
  };

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
      clearTestArtifactContext();
      setUser(newUser);

      if (newUser) {
        if (runSessionMaintenance) setPasswordCredentialStatus('checking');
        // Cleanup URL hash
        if (window.location.hash.includes('access_token=')) {
          window.history.replaceState(null, '', window.location.pathname + window.location.search);
        }

        try {
          const resolvedProfile = await fetchProfile(newUser, runSessionMaintenance);
          const isProfileAdministrator =
            resolvedProfile?.role === 'administrator' ||
            resolvedProfile?.roles?.includes('administrator') === true;
          const testIdentity = testArtifactIdentityForAuthenticatedUser({
            isDevelopment: import.meta.env.DEV,
            runId: import.meta.env.VITE_TEST_ARTIFACT_RUN_ID,
            ownerId: newUser.id,
            email: newUser.email,
            isAdministrator: isProfileAdministrator,
          });
          if (testIdentity) bindTestArtifactContext(testIdentity);
          else clearTestArtifactContext();
          if (runSessionMaintenance) {
            try {
              await refreshPasswordCredentialStatus();
            } catch (error) {
              console.error('[Auth] Não foi possível confirmar a credencial de senha:', error);
            }
          }
        } finally {
          if (isInitialSessionSource) initialSessionUserId = sessionUserId;
          if (active) setLoading(false);
          handlingSession = false;
        }
      } else {
        clearTestArtifactContext();
        try {
          queryClient.clear();
        } catch (e) {
          console.warn('[Auth] Falha ao limpar cache de queries na perda de sessão:', e);
        }
        if (isInitialSessionSource) initialSessionUserId = sessionUserId;
        setPasswordCredentialStatus('idle');
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
        const isMasterEmail = isMasterEmailCheck(authEmail);
        const finalRole = isMasterEmail ? 'administrator' : authRole;

        const syntheticUser = {
          id: authUserId,
          email: authEmail,
          user_metadata: { full_name: isMasterEmail ? 'Matheus Morante' : authEmail.split('@')[0] },
          app_metadata: {},
          aud: 'authenticated',
          created_at: new Date().toISOString(),
        } as any;

        setUser(syntheticUser);
        setProfile({
          id: authUserId,
          email: authEmail,
          role: finalRole,
          roles: [finalRole],
          full_name: isMasterEmail ? 'Matheus Morante' : authEmail.split('@')[0],
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
      clearTimeout(failsafe);
      // INITIAL_SESSION é a fonte de verdade da sessão restaurada. O bloqueio
      // `handlingSession` já impede processamento duplicado com getSession().
      handleSession(session, event);
    });

    return () => {
      active = false;
      clearTestArtifactContext();
      clearTimeout(failsafe);
      subscription.unsubscribe();
    };
  }, [refreshPasswordCredentialStatus]);

  useEffect(() => {
    if (profile) {
      (window as any).userProfile = profile;
      // Se estiver no WebView do React Native, enviar mensagem imediatamente
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

  const logout = async () => {
    try {
      queryClient.clear();
    } catch (e) {
      console.warn('[Auth] Falha ao limpar cache de queries no logout:', e);
    }
    await supabase.auth.signOut();
    clearTestArtifactContext();
    setUser(null);
    setProfile(null);
    setActiveRoleModeState(null);
    setPasswordCredentialStatus('idle');
  };

  const value = useMemo(
    () => ({
      user,
      profile: effectiveProfile,
      isAuthenticated: !!user,
      loading,
      isAdmin: effectiveRoles.some((role) => role === 'administrator' || role === 'manager'),
      isAdministrator: effectiveRoles.includes('administrator'),
      isManager: effectiveRoles.some((role) => role === 'manager' || role === 'administrator'),
      isRealAdministrator,
      activeRoleMode: isRoleModeActive ? activeRoleModeState : null,
      setActiveRoleMode,
      isPending:
        !loading &&
        !!user &&
        !(profile?.roles?.length || (profile?.role && profile.role !== 'pending')),
      passwordCredentialStatus,
      refreshPasswordCredentialStatus,
      createPasswordCredential,
      logout,
    }),
    [
      user,
      profile,
      effectiveProfile,
      effectiveRoles,
      loading,
      isRealAdministrator,
      isRoleModeActive,
      activeRoleModeState,
      setActiveRoleMode,
      passwordCredentialStatus,
      refreshPasswordCredentialStatus,
      createPasswordCredential,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
