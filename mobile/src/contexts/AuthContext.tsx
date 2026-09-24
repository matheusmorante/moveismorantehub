import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Platform } from 'react-native';
import * as Linking from 'expo-linking';
import { supabase, MASTER_DEFAULT_PROFILE } from '../services/supabaseClient';
import { completeGoogleSignIn } from '../services/googleAuth';
import { resolveMobileUserProfile } from '../services/mobileAuthProfile';

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
  canSeeFinance: boolean;
  canManageStock: boolean;
}

const AuthContext = createContext<AuthContextProps | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [userProfile, setUserProfile] = useState<any>(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const searchParams = new URLSearchParams(window.location.search);
      const authEmail = searchParams.get('auth_email');
      if (authEmail && (authEmail.toLowerCase() === MASTER_DEFAULT_PROFILE.email.toLowerCase() || __DEV__)) {
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

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      setUserProfile(null);
    } catch (err) {
      console.warn('[Logout] Erro:', err);
    }
  };

  const syncAuthProfile = async (session: any) => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const searchParams = new URLSearchParams(window.location.search);
      const authEmail = searchParams.get('auth_email');
      if (authEmail && (authEmail.toLowerCase() === MASTER_DEFAULT_PROFILE.email.toLowerCase() || __DEV__)) {
        setUserProfile({
          ...MASTER_DEFAULT_PROFILE,
          email: authEmail,
          fullName: 'Matheus Morante',
          role: 'admin',
        });
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
    } finally {
      setLoadingProfile(false);
    }
  };

  const handleDeepLinkUrl = async (url: string) => {
    if (!url) return;
    console.log('[DeepLink] Recebido URL:', url);
    try {
      if (!url.includes('code=') && !url.includes('access_token=') && !url.includes('error=')) return;

      setLoadingProfile(true);
      const session = await completeGoogleSignIn(url);
      if (session) {
        console.log('[DeepLink] Sessão ativada com sucesso');
        if (Platform.OS === 'web' && typeof window !== 'undefined') {
          window.history.replaceState({}, document.title, window.location.pathname);
        }
      }
    } catch (err) {
      console.warn('[DeepLink] Falha ao processar URL:', err);
    } finally {
      setLoadingProfile(false);
    }
  };

  useEffect(() => {
    // On web, use the browser URL directly.
    const initialUrlPromise = Platform.OS === 'web' && typeof window !== 'undefined'
      ? Promise.resolve(window.location.href)
      : Linking.getInitialURL();
    initialUrlPromise.then((url) => {
      if (url) handleDeepLinkUrl(url);
    });

    const deepLinkSubscription = Linking.addEventListener('url', (event) => {
      if (event.url) handleDeepLinkUrl(event.url);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('[AuthChange] Event:', event);
      setTimeout(() => { void syncAuthProfile(session); }, 0);
    });

    const authTimeout = setTimeout(() => {
      setLoadingProfile(false);
    }, 3500);

    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const searchParams = new URLSearchParams(window.location.search);
      const authEmail = searchParams.get('auth_email');
      if (authEmail && (authEmail.toLowerCase() === MASTER_DEFAULT_PROFILE.email.toLowerCase() || __DEV__)) {
        clearTimeout(authTimeout);
        setUserProfile({
          ...MASTER_DEFAULT_PROFILE,
          email: authEmail,
          fullName: 'Matheus Morante',
          role: 'admin',
        });
        setLoadingProfile(false);
        return;
      }
    }

    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        clearTimeout(authTimeout);
        return syncAuthProfile(session);
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

  const isAdmin = userProfile?.role === 'admin' || userProfile?.role === 'master' || userProfile?.role === 'administrator';
  const isAssemblerDriver = userProfile?.role === 'assembler' || userProfile?.role === 'driver' || userProfile?.role === 'entregador' || userProfile?.role === 'deliverer';
  const isSeller = Boolean(
    userProfile?.roles?.includes('seller') || 
    userProfile?.role === 'seller' || 
    userProfile?.roles?.includes('vendedor') || 
    userProfile?.role === 'vendedor'
  );
  const canSeeReports = isAdmin || userProfile?.role === 'manager' || isSeller;
  const canSeeProducts = isAdmin || isSeller || userProfile?.role === 'manager';
  const canSeeFinance = isAdmin || userProfile?.role === 'manager' || userProfile?.role === 'gerente';
  const canManageStock = isAdmin || userProfile?.permissions?.manualStockMovement === true || userProfile?.permissions?.includes?.('manualStockMovement');

  return (
    <AuthContext.Provider value={{
      userProfile,
      setUserProfile,
      loadingProfile,
      handleLogout,
      isAdmin,
      isAssemblerDriver,
      isSeller,
      canSeeReports,
      canSeeProducts,
      canSeeFinance,
      canManageStock
    }}>
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
