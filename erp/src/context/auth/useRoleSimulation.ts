import { useState, useCallback, useEffect, useMemo } from 'react';
import type { Profile, UserRole } from './auth.types';

export interface RoleSimulationState {
  activeRoleMode: UserRole | null;
  activeRoleModeState: UserRole | null;
  setActiveRoleMode: (role: UserRole | null) => void;
  resetRoleMode: () => void;
  isRealAdministrator: boolean;
  isRoleModeActive: boolean;
  effectiveProfile: Profile | null;
  effectiveRoles: UserRole[];
  isAdmin: boolean;
  isAdministrator: boolean;
  isManager: boolean;
}

/**
 * Custom hook to manage role simulation for administrators.
 * Allows administrators to preview the application as deliverer, seller, etc.,
 * without modifying their actual database credentials or permanent profile.
 */
export function useRoleSimulation(profile: Profile | null): RoleSimulationState {
  const [activeRoleModeState, setActiveRoleModeState] = useState<UserRole | null>(null);

  const isRealAdministrator = useMemo(() => {
    return (
      profile?.role === 'administrator' ||
      profile?.roles?.includes('administrator') === true
    );
  }, [profile]);

  const setActiveRoleMode = useCallback(
    (role: UserRole | null) => {
      if (!isRealAdministrator) return;
      setActiveRoleModeState(role === 'pending' ? null : role);
    },
    [isRealAdministrator]
  );

  const resetRoleMode = useCallback(() => {
    setActiveRoleModeState(null);
  }, []);

  useEffect(() => {
    if (!isRealAdministrator) {
      setActiveRoleModeState(null);
    }
  }, [isRealAdministrator]);

  const isRoleModeActive = isRealAdministrator && activeRoleModeState !== null;

  const effectiveProfile = useMemo(() => {
    if (!profile || !isRoleModeActive || !activeRoleModeState) return profile;
    return { ...profile, role: activeRoleModeState, roles: [activeRoleModeState] };
  }, [profile, isRoleModeActive, activeRoleModeState]);

  const effectiveRoles = useMemo<UserRole[]>(() => {
    if (effectiveProfile?.roles?.length) {
      return effectiveProfile.roles;
    }
    if (effectiveProfile?.role) {
      return [effectiveProfile.role];
    }
    return [];
  }, [effectiveProfile]);

  const isAdmin = useMemo(
    () => effectiveRoles.some((role) => role === 'administrator' || role === 'manager'),
    [effectiveRoles]
  );

  const isAdministrator = useMemo(
    () => effectiveRoles.includes('administrator'),
    [effectiveRoles]
  );

  const isManager = useMemo(
    () => effectiveRoles.some((role) => role === 'manager' || role === 'administrator'),
    [effectiveRoles]
  );

  return {
    activeRoleMode: isRoleModeActive ? activeRoleModeState : null,
    activeRoleModeState,
    setActiveRoleMode,
    resetRoleMode,
    isRealAdministrator,
    isRoleModeActive,
    effectiveProfile,
    effectiveRoles,
    isAdmin,
    isAdministrator,
    isManager,
  };
}
