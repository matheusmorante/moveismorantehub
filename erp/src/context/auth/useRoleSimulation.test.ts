// @vitest-environment happy-dom
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { useRoleSimulation } from './useRoleSimulation';
import type { Profile } from './auth.types';

describe('useRoleSimulation', () => {
  const adminProfile: Profile = {
    id: 'admin-id',
    email: 'admin@example.com',
    role: 'administrator',
    roles: ['administrator'],
    full_name: 'Admin User',
  };

  const sellerProfile: Profile = {
    id: 'seller-id',
    email: 'seller@example.com',
    role: 'seller',
    roles: ['seller'],
    full_name: 'Seller User',
  };

  it('identifies real administrator correctly', () => {
    const { result } = renderHook(() => useRoleSimulation(adminProfile));
    expect(result.current.isRealAdministrator).toBe(true);
    expect(result.current.isAdmin).toBe(true);
    expect(result.current.isAdministrator).toBe(true);
    expect(result.current.isRoleModeActive).toBe(false);
  });

  it('identifies non-administrator correctly and blocks role simulation', () => {
    const { result } = renderHook(() => useRoleSimulation(sellerProfile));
    expect(result.current.isRealAdministrator).toBe(false);
    expect(result.current.isAdmin).toBe(false);
    expect(result.current.isAdministrator).toBe(false);

    // Attempting to simulate as administrator should be blocked
    act(() => {
      result.current.setActiveRoleMode('administrator');
    });
    expect(result.current.activeRoleMode).toBeNull();
    expect(result.current.isRoleModeActive).toBe(false);
    expect(result.current.effectiveProfile).toEqual(sellerProfile);
  });

  it('allows administrator to activate role simulation', () => {
    const { result } = renderHook(() => useRoleSimulation(adminProfile));

    act(() => {
      result.current.setActiveRoleMode('deliverer');
    });

    expect(result.current.isRoleModeActive).toBe(true);
    expect(result.current.activeRoleMode).toBe('deliverer');
    expect(result.current.effectiveProfile?.role).toBe('deliverer');
    expect(result.current.effectiveProfile?.roles).toEqual(['deliverer']);
    expect(result.current.isAdministrator).toBe(false);
    expect(result.current.isRealAdministrator).toBe(true); // Still truly an admin in db
  });

  it('clears active role mode when resetRoleMode is called', () => {
    const { result } = renderHook(() => useRoleSimulation(adminProfile));

    act(() => {
      result.current.setActiveRoleMode('stockist');
    });
    expect(result.current.activeRoleMode).toBe('stockist');

    act(() => {
      result.current.resetRoleMode();
    });
    expect(result.current.activeRoleMode).toBeNull();
    expect(result.current.effectiveProfile).toEqual(adminProfile);
  });

  it('resets role mode automatically if profile changes to non-admin', () => {
    let currentProfile: Profile | null = adminProfile;
    const { result, rerender } = renderHook(() => useRoleSimulation(currentProfile));

    act(() => {
      result.current.setActiveRoleMode('seller');
    });
    expect(result.current.activeRoleMode).toBe('seller');

    // Switch user/profile to non-admin
    currentProfile = sellerProfile;
    rerender();

    expect(result.current.activeRoleMode).toBeNull();
    expect(result.current.isRoleModeActive).toBe(false);
  });
});
