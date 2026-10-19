import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
} from 'react';
import { supabase } from '@/pages/utils/supabaseConfig';
import { User } from '@supabase/supabase-js';
import {
  checkCurrentUserHasPassword,
  createCurrentUserPassword,
} from '@/services/authPasswordSetup';
import { shouldRunAuthSessionMaintenance } from '../../../shared-utils/authSessionPolicy';
import { withTimeout } from '../../../shared-utils/withTimeout';
import { waitForAuthOperation } from '../../../shared-utils/authOperationTimeout';
import {
  bindTestArtifactContext,
  clearTestArtifactContext,
  getTestArtifactContext,
  testArtifactIdentityForAuthenticatedUser,
} from '../../../shared-utils/testArtifactContext';
import { queryClient } from '@/lib/queryClient';
import { verifyConfiguredTestArtifactOperator } from '@/services/testArtifactOperator';

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

const CACHE_KEY_PREFIX = 'morantehub_auth_profile_';

function getCachedProfile(userId: string): Profile | null {
  try {
    if (typeof localStorage === 'undefined') return null;
    const raw = localStorage.getItem(`${CACHE_KEY_PREFIX}${userId}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && parsed.id === userId && parsed.role) {
      return parsed as Profile;
    }
  } catch (e) {
    // Ignore storage parse errors
  }
  return null;
}

function setCachedProfile(userId: string, profile: Profile): void {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(`${CACHE_KEY_PREFIX}${userId}`, JSON.stringify(profile));
  } catch (e) {
    // Ignore storage write errors
  }
}

function clearCachedProfile(userId: string): void {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.removeItem(`${CACHE_KEY_PREFIX}${userId}`);
  } catch (e) {
    // Ignore storage removal errors
  }
}

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

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Shared bounded wait also protects commercial/fiscal preflight queries.

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const profileResolvedUserIdRef = useRef<string | null>(null);
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

      // 1. Proativamente renova o token se expirado ou prestes a expirar (< 60s)
      try {
        if (typeof supabase?.auth?.getSession === 'function') {
          const { data: sessionData } = await supabase.auth.getSession();
          const currentSession = sessionData?.session;
          const nowSeconds = Math.floor(Date.now() / 1000);
          if (
            currentSession?.expires_at &&
            currentSession.expires_at - nowSeconds < 60 &&
            typeof supabase.auth?.refreshSession === 'function'
          ) {
            console.log('[Auth] Token expirado ou próximo do vencimento. Renovando sessão preventivamente...');
            await supabase.auth.refreshSession();
          }
        }
      } catch (tokenCheckErr) {
        console.warn('[Auth] Aviso ao verificar renovação preventiva de token:', tokenCheckErr);
      }

      // 2. Busca o perfil no banco com proteção de timeout
      let queryResult = await withTimeout(
        supabase
          .from('profiles')
          .select(PROFILE_COLUMNS)
          .eq('id', user.id)
          .maybeSingle(),
        6000,
        { data: null, error: { message: 'timeout' } } as any,
        'profiles.select'
      );

      // 3. Se a consulta falhou por token/JWT expirado ou não autorizado (401), tenta refresh e repete
      const isAuthError =
        queryResult?.error &&
        (queryResult.error.message?.includes('JWT') ||
          queryResult.error.message?.includes('token') ||
          queryResult.error.message?.includes('expired') ||
          queryResult.error.code === 'PGRST301' ||
          (queryResult.error as any).status === 401);

      if (isAuthError && typeof supabase?.auth?.refreshSession === 'function') {
        console.log('[Auth] Erro de autenticação no select de profiles. Renovando sessão e tentando novamente...');
        try {
          const { error: refreshErr } = await supabase.auth.refreshSession();
          if (!refreshErr) {
            queryResult = await withTimeout(
              supabase
                .from('profiles')
                .select(PROFILE_COLUMNS)
                .eq('id', user.id)
                .maybeSingle(),
              6000,
              { data: null, error: { message: 'timeout' } } as any,
              'profiles.select.retry'
            );
          }
        } catch (rErr) {
          console.warn('[Auth] Falha ao tentar renovar sessão após erro de auth:', rErr);
        }
      }

      let data: Profile | null = queryResult?.data || null;

      // 4. Se a consulta retornou ERRO (não 0 registros, mas falha de rede/timeout/banco/auth):
      if (queryResult?.error && !data) {
        console.warn('[Auth] Erro ao carregar perfil do banco:', queryResult.error);
        const cached = getCachedProfile(user.id);
        if (cached) {
          console.log('[Auth] Recuperando perfil do cache local após falha transitória de consulta');
          profileResolvedUserIdRef.current = user.id;
          setProfile(cached);
          return cached;
        }

        if (isMasterEmail) {
          const masterProfile: Profile = {
            id: user.id,
            email: user.email || '',
            role: 'administrator',
            roles: ['administrator'],
            full_name: googleName || 'Matheus Morante',
          };
          profileResolvedUserIdRef.current = user.id;
          setProfile(masterProfile);
          setCachedProfile(user.id, masterProfile);
          return masterProfile;
        }

        // NÃO atribuir 'pending'! Se o perfil não pôde ser verificado por erro transitório ou falta de token,
        // retorna null para continuar em sincronização e não exibir falsamente o modal de aprovação.
        return null;
      }

      // 5. Perfil genuinamente não existe no banco (query completou com sucesso sem erro, mas 0 linhas)
      if (!data) {
        console.log('[Auth] Perfil não encontrado no banco. Criando registro...');
        const assignedRole: UserRole = isMasterEmail ? 'administrator' : 'pending';
        const assignedRoles: UserRole[] = [assignedRole];
        const newProfile: Profile = {
          id: user.id,
          email: user.email || '',
          role: assignedRole,
          roles: assignedRoles,
          full_name:
            googleName ||
            user.email?.split('@')[0] ||
            (isMasterEmail ? 'Matheus Morante' : 'Novo Usuário'),
        };

        const { data: upsertedData } = await withTimeout(
          supabase
            .from('profiles')
            .upsert(newProfile)
            .select(PROFILE_COLUMNS)
            .maybeSingle(),
          5000,
          { data: null, error: null } as any,
          'profiles.upsert'
        );

        data = upsertedData || newProfile;
      }

      if (data && googleName && data.full_name !== googleName) {
        data.full_name = googleName;
        await supabase.from('profiles').update({ full_name: googleName }).eq('id', user.id);
      }

      // Garante que o usuário logado via Google sincronize seu colaborador na tabela people (1 por e-mail)
      if (userEmail && syncEmployee && data) {
        try {
          const { data: existingEmps } = await withTimeout(
            supabase
              .from('people')
              .select('id,email,full_name')
              .eq('person_type', 'employees')
              .eq('deleted', false)
              .ilike('email', userEmail)
              .limit(1),
            4000,
            { data: null, error: null } as any,
            'people.select'
          );

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
            const defaultRole: UserRole = isMasterEmail ? 'administrator' : (data?.role || 'pending');
            const defaultRoles: UserRole[] = isMasterEmail ? ['administrator'] : (data?.roles?.length ? data.roles : [defaultRole]);

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

      if (data) {
        const resolvedProfile = data as Profile;
        profileResolvedUserIdRef.current = user.id;
        setProfile(resolvedProfile);
        setCachedProfile(user.id, resolvedProfile);
        return resolvedProfile;
      }
      return null;
    } catch (err) {
      console.error('[Auth] Error fetching profile:', err);
      const userEmail = (user.email || '').toLowerCase().trim();
      const isMasterEmail = isMasterEmailCheck(userEmail);

      const cached = getCachedProfile(user.id);
      if (cached) {
        profileResolvedUserIdRef.current = user.id;
        setProfile(cached);
        return cached;
      }

      if (isMasterEmail) {
        const masterProfile: Profile = {
          id: user.id,
          email: user.email || '',
          role: 'administrator',
          roles: ['administrator'],
          full_name: user.user_metadata?.full_name || 'Matheus Morante',
        };
        profileResolvedUserIdRef.current = user.id;
        setProfile(masterProfile);
        setCachedProfile(user.id, masterProfile);
        return masterProfile;
      }

      return null;
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
          const resolvedProfile = await fetchProfile(newUser, runSessionMaintenance);
          const isProfileAdministrator =
            resolvedProfile?.role === 'administrator' ||
            resolvedProfile?.roles?.includes('administrator') === true;
          const configuredOperatorAuthorized =
            import.meta.env.DEV
            && isProfileAdministrator
            ? await verifyConfiguredTestArtifactOperator(session?.access_token)
            : false;
          const ownedTestContext = previousTestContext?.ownerId === newUser.id
            ? previousTestContext : null;
          const testIdentity = testArtifactIdentityForAuthenticatedUser({
            isDevelopment: import.meta.env.DEV,
            runId: import.meta.env.VITE_TEST_ARTIFACT_RUN_ID
              || ownedTestContext?.runId
              || (configuredOperatorAuthorized ? crypto.randomUUID() : undefined),
            scenarioKey: import.meta.env.VITE_TEST_ARTIFACT_SCENARIO_KEY
              || (!import.meta.env.VITE_TEST_ARTIFACT_RUN_ID
                ? ownedTestContext?.scenarioKey : undefined),
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
        profileResolvedUserIdRef.current = authUserId;
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
    const { error } = await waitForAuthOperation(supabase.auth.signOut(), 'auth:sair');
    if (error) throw new Error(error.message);
    clearTestArtifactContext();
    profileResolvedUserIdRef.current = null;
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
