import React, {
  createContext,
  useContext,
  useMemo,
  useRef,
  useCallback,
} from 'react';
import type { AuthContextType } from './auth/auth.types';
import { usePasswordCredentials } from './auth/usePasswordCredentials';
import { useRoleSimulation } from './auth/useRoleSimulation';
import { useAuthSession } from './auth/useAuthSession';

// Re-export all domain types, cache utilities, services, and hooks for 100% backward compatibility
export * from './auth';

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const passwordCredentials = usePasswordCredentials();
  const resetRoleModeRef = useRef<() => void>(() => {});

  const resetRoleMode = useCallback(() => {
    resetRoleModeRef.current();
  }, []);

  const { user, profile, loading, logout } = useAuthSession({
    setPasswordCredentialStatus: passwordCredentials.setPasswordCredentialStatus,
    refreshPasswordCredentialStatus: passwordCredentials.refreshPasswordCredentialStatus,
    resetPasswordCredentialStatus: passwordCredentials.resetPasswordCredentialStatus,
    resetRoleMode,
  });

  const roleSimulation = useRoleSimulation(profile);
  resetRoleModeRef.current = roleSimulation.resetRoleMode;

  const isPending = useMemo(() => {
    return (
      !loading &&
      !!user &&
      !(profile?.roles?.length || (profile?.role && profile.role !== 'pending'))
    );
  }, [loading, user, profile]);

  const value = useMemo<AuthContextType>(
    () => ({
      user,
      profile: roleSimulation.effectiveProfile,
      isAuthenticated: !!user,
      loading,
      isAdmin: roleSimulation.isAdmin,
      isAdministrator: roleSimulation.isAdministrator,
      isManager: roleSimulation.isManager,
      isRealAdministrator: roleSimulation.isRealAdministrator,
      activeRoleMode: roleSimulation.activeRoleMode,
      setActiveRoleMode: roleSimulation.setActiveRoleMode,
      isPending,
      passwordCredentialStatus: passwordCredentials.passwordCredentialStatus,
      refreshPasswordCredentialStatus: passwordCredentials.refreshPasswordCredentialStatus,
      createPasswordCredential: passwordCredentials.createPasswordCredential,
      logout,
    }),
    [
      user,
      loading,
      isPending,
      roleSimulation.effectiveProfile,
      roleSimulation.isAdmin,
      roleSimulation.isAdministrator,
      roleSimulation.isManager,
      roleSimulation.isRealAdministrator,
      roleSimulation.activeRoleMode,
      roleSimulation.setActiveRoleMode,
      passwordCredentials.passwordCredentialStatus,
      passwordCredentials.refreshPasswordCredentialStatus,
      passwordCredentials.createPasswordCredential,
      logout,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
