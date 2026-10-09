import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Platform } from 'react-native';
import * as Linking from 'expo-linking';
import { supabase, MASTER_DEFAULT_PROFILE } from '../services/supabaseClient';
import { completeGoogleSignIn } from '../services/googleAuth';
import { resolveMobileUserProfile } from '../services/mobileAuthProfile';
import {
  hasProductPermission,
  normalizePermissionRoles,
  PRODUCT_PERMISSION_ACTIONS,
} from '../../../shared-utils/productPermissions';
import {
  checkCurrentUserHasPassword,
  createCurrentUserPassword,
} from '../services/authPasswordSetup';
import { shouldRunAuthSessionMaintenance } from '../../../shared-utils/authSessionPolicy';

export type PasswordCredentialStatus = 'idle' | 'checking' | 'required' | 'configured' | 'error';

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
  const [userProfile, setUserProfile] = useState<any>(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const searchParams = new URLSearchParams(window.location.search);
      const authEmail = searchParams.get('auth_email');
      if (
        authEmail &&
        (authEmail.toLowerCase() === MASTER_DEFAULT_PROFILE.email.toLowerCase() || __DEV__)
      ) {
        return {
          ...MASTER_DEFAULT_PROFILE,
          email: authEmail,
          fullName: 'Matheus Morante',
          role: 'admin',
        };
      }
    }
    return null;
  });

  const [loadingProfile, setLoadingProfile] = useState(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const searchParams = new URLSearchParams(window.location.search);
      if (searchParams.get('auth_email')) return false;
    }
    return true;
  });

  const [passwordCredentialStatus, setPasswordCredentialStatus] =
    useState<PasswordCredentialStatus>('idle');
  const [passwordRecoveryInProgress, setPasswordRecoveryInProgress] = useState(false);
  const [rolePermissions, setRolePermissions] = useState<Record<string, string[]>>({});
  const [rolePermissionsLoaded, setRolePermissionsLoaded] = useState(false);
  const [rolePermissionsLoadFailed, setRolePermissionsLoadFailed] = useState(false);
  const [permissionReloadVersion, setPermissionReloadVersion] = useState(0);

  const beginPasswordRecovery = () => setPasswordRecoveryInProgress(true);
  const endPasswordRecovery = () => setPasswordRecoveryInProgress(false);

  const refreshPasswordCredentialStatus = async () => {
    setPasswordCredentialStatus('checking');
    try {
      const hasPassword = await checkCurrentUserHasPassword(supabase);
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

  const profileAccessKey = userProfile?.id || userProfile?.email || null;

  useEffect(() => {
    let active = true;
    if (!profileAccessKey) {
      setRolePermissions({});
      setRolePermissionsLoaded(false);
      setRolePermissionsLoadFailed(false);
      return () => {
        active = false;
      };
    }

    const loadRolePermissions = async () => {
      try {
        const { data, error } = await supabase
          .from('settings')
          .select('data')
          .eq('id', 'app')
          .maybeSingle();
        if (!active) return;
        if (error) throw error;

        const saved = data?.data?.rolePermissions;
        const safePermissions: Record<string, string[]> =
          saved && typeof saved === 'object' && !Array.isArray(saved)
            ? Object.fromEntries(
                Object.entries(saved).map(([actionId, roles]) => [
                  actionId,
                  Array.isArray(roles) ? roles.filter((role) => typeof role === 'string') : [],
                ])
              )
            : {};

        // O ERP migra permissões antigas dos submódulos a partir do acesso ao cadastro.
        // Aplicamos o mesmo fallback antes de a migração do ERP gravar essas chaves.
        for (const action of PRODUCT_PERMISSION_ACTIONS) {
          if (
            action.id.startsWith('viewProduct') &&
            action.id !== 'viewProducts' &&
            !Object.prototype.hasOwnProperty.call(safePermissions, action.id)
          ) {
            safePermissions[action.id] = safePermissions.productConfig ?? [...action.defaultRoles];
          }
        }

        setRolePermissions(safePermissions);
        setRolePermissionsLoaded(true);
        setRolePermissionsLoadFailed(false);
      } catch {
        if (!active) return;
        console.warn('[Permissions] Falha ao carregar os acessos configurados.');
        setRolePermissions({});
        setRolePermissionsLoadFailed(true);
      }
    };

    setRolePermissionsLoaded(false);
    setRolePermissionsLoadFailed(false);
    void loadRolePermissions();

    const settingsChannel = supabase
      .channel('mobile-product-role-permissions')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'settings', filter: 'id=eq.app' },
        () => void loadRolePermissions()
      )
      .subscribe();

    return () => {
      active = false;
      void supabase.removeChannel(settingsChannel);
    };
  }, [profileAccessKey, permissionReloadVersion]);

  const reloadRolePermissions = () => setPermissionReloadVersion((version) => version + 1);

  const saveRolePermissions = async (updates: Record<string, string[]>) => {
    const productActionIds = new Set(PRODUCT_PERMISSION_ACTIONS.map((action) => action.id));
    const safeUpdates = Object.fromEntries(
      Object.entries(updates).filter(([actionId]) => productActionIds.has(actionId))
    );
    if (Object.keys(safeUpdates).length === 0) return;

    const { data: current, error: readError } = await supabase
      .from('settings')
      .select('data')
      .eq('id', 'app')
      .maybeSingle();
    if (readError) throw readError;

    const currentData = current?.data && typeof current.data === 'object' && !Array.isArray(current.data)
      ? current.data
      : {};
    const currentPermissions = currentData.rolePermissions &&
      typeof currentData.rolePermissions === 'object' &&
      !Array.isArray(currentData.rolePermissions)
        ? currentData.rolePermissions
        : {};
    const nextPermissions = { ...currentPermissions, ...safeUpdates };
    const { error: saveError } = await supabase.from('settings').upsert({
      id: 'app',
      data: { ...currentData, rolePermissions: nextPermissions },
    });
    if (saveError) throw saveError;

    setRolePermissions(nextPermissions as Record<string, string[]>);
    setRolePermissionsLoaded(true);
    setRolePermissionsLoadFailed(false);
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      setUserProfile(null);
      setPasswordCredentialStatus('idle');
      setPasswordRecoveryInProgress(false);
    } catch (err) {
      console.warn('[Logout] Erro:', err);
    }
  };

  const syncAuthProfile = async (session: any, checkPasswordCredential = true) => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const searchParams = new URLSearchParams(window.location.search);
      const authEmail = searchParams.get('auth_email');
      if (
        authEmail &&
        (authEmail.toLowerCase() === MASTER_DEFAULT_PROFILE.email.toLowerCase() || __DEV__)
      ) {
        setUserProfile({
          ...MASTER_DEFAULT_PROFILE,
          email: authEmail,
          fullName: 'Matheus Morante',
          role: 'admin',
        });
        setPasswordCredentialStatus('idle');
        setLoadingProfile(false);
        return;
      }
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
    } catch (err) {
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

    // On web, use the browser URL directly.
    const initialUrlPromise =
      Platform.OS === 'web' && typeof window !== 'undefined'
        ? Promise.resolve(window.location.href)
        : Linking.getInitialURL();
    initialUrlPromise.then((url) => {
      if (url) handleDeepLinkUrl(url);
    });

    const deepLinkSubscription = Linking.addEventListener('url', (event) => {
      if (event.url) handleDeepLinkUrl(event.url);
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

    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const searchParams = new URLSearchParams(window.location.search);
      const authEmail = searchParams.get('auth_email');
      if (
        authEmail &&
        (authEmail.toLowerCase() === MASTER_DEFAULT_PROFILE.email.toLowerCase() || __DEV__)
      ) {
        clearTimeout(authTimeout);
        setUserProfile({
          ...MASTER_DEFAULT_PROFILE,
          email: authEmail,
          fullName: 'Matheus Morante',
          role: 'admin',
        });
        setPasswordCredentialStatus('idle');
        setLoadingProfile(false);
        return;
      }
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

  const profileRoleValues = Array.isArray(userProfile?.roles)
    ? userProfile.roles.filter((role: string) => role !== 'pending')
    : [];
  const roles = normalizePermissionRoles(
    profileRoleValues.length > 0 ? profileRoleValues : [userProfile?.role]
  );
  const isAdmin = roles.includes('administrator');
  const isAssemblerDriver =
    userProfile?.role === 'assembler' ||
    userProfile?.role === 'driver' ||
    userProfile?.role === 'entregador' ||
    userProfile?.role === 'deliverer';
  const isSeller = roles.includes('seller');
  const canSeeReports = isAdmin || userProfile?.role === 'manager' || isSeller;
  const canUseProductPermission = (actionId: string) => {
    if (isAdmin) return hasProductPermission(actionId, roles, rolePermissions);
    if (!rolePermissionsLoaded) return false;
    return hasProductPermission(actionId, roles, rolePermissions);
  };
  const canSeeProducts = [
    'viewProducts',
    'viewProductCharacteristics',
    'viewProductCategories',
    'viewProductCompositions',
    'viewProductReconciliation',
  ].some(canUseProductPermission);
  const canSeeFinance =
    isAdmin || userProfile?.role === 'manager' || userProfile?.role === 'gerente';
  const canManageStock =
    isAdmin ||
    userProfile?.permissions?.manualStockMovement === true ||
    userProfile?.permissions?.includes?.('manualStockMovement');

  return (
    <AuthContext.Provider
      value={{
        userProfile,
        setUserProfile,
        loadingProfile,
        handleLogout,
        isAdmin,
        isAssemblerDriver,
        isSeller,
        canSeeReports,
        canSeeProducts,
        canUseProductPermission,
        rolePermissions,
        rolePermissionsLoaded,
        rolePermissionsLoadFailed,
        reloadRolePermissions,
        saveRolePermissions,
        canSeeFinance,
        canManageStock,
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
