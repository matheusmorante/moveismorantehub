// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useDesktopNavPermissions } from '../useDesktopNavPermissions';
import type { UserProfile } from '../../../../context/AuthContext';

describe('useDesktopNavPermissions', () => {
  it('retorna permissões desabilitadas quando profile é null', () => {
    const { result } = renderHook(() => useDesktopNavPermissions(null));

    expect(result.current.canViewProducts).toBe(false);
    expect(result.current.canViewOrders).toBe(false);
    expect(result.current.canViewStock).toBe(false);
    expect(result.current.canViewFiscal).toBe(false);
    expect(result.current.canViewPeople).toBe(false);
    expect(result.current.canUseFinance).toBe(false);
  });

  it('habilita permissões adequadas quando o perfil possui as roles', () => {
    const profile = {
      id: 'usr-1',
      role: 'administrator',
    } as unknown as UserProfile;

    const { result } = renderHook(() => useDesktopNavPermissions(profile));

    expect(result.current.canViewProducts).toBe(true);
    expect(result.current.canViewProductMenu).toBe(true);
    expect(result.current.canViewAssistanceOrders).toBe(true);
    expect(result.current.canViewOrders).toBe(true);
    expect(result.current.canViewFiscalOutbound).toBe(true);
    expect(result.current.canViewFiscal).toBe(true);
  });
});
