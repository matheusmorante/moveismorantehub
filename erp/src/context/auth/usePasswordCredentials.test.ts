// @vitest-environment happy-dom
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { usePasswordCredentials } from './usePasswordCredentials';

const mocks = vi.hoisted(() => ({
  checkCurrentUserHasPassword: vi.fn(),
  createCurrentUserPassword: vi.fn(),
}));

vi.mock('@/pages/utils/supabaseConfig', () => ({
  supabase: {},
}));

vi.mock('@/services/authPasswordSetup', () => ({
  checkCurrentUserHasPassword: (...args: unknown[]) => mocks.checkCurrentUserHasPassword(...args),
  createCurrentUserPassword: (...args: unknown[]) => mocks.createCurrentUserPassword(...args),
}));

describe('usePasswordCredentials', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('initializes with idle status', () => {
    const { result } = renderHook(() => usePasswordCredentials());
    expect(result.current.passwordCredentialStatus).toBe('idle');
  });

  it('updates status to configured when checkCurrentUserHasPassword returns true', async () => {
    mocks.checkCurrentUserHasPassword.mockResolvedValue(true);
    const { result } = renderHook(() => usePasswordCredentials());

    let hasPassword = false;
    await act(async () => {
      hasPassword = await result.current.refreshPasswordCredentialStatus();
    });

    expect(hasPassword).toBe(true);
    expect(result.current.passwordCredentialStatus).toBe('configured');
  });

  it('updates status to required when checkCurrentUserHasPassword returns false', async () => {
    mocks.checkCurrentUserHasPassword.mockResolvedValue(false);
    const { result } = renderHook(() => usePasswordCredentials());

    let hasPassword = true;
    await act(async () => {
      hasPassword = await result.current.refreshPasswordCredentialStatus();
    });

    expect(hasPassword).toBe(false);
    expect(result.current.passwordCredentialStatus).toBe('required');
  });

  it('sets status to error when checkCurrentUserHasPassword throws', async () => {
    mocks.checkCurrentUserHasPassword.mockRejectedValue(new Error('Network error'));
    const { result } = renderHook(() => usePasswordCredentials());

    await act(async () => {
      await expect(result.current.refreshPasswordCredentialStatus()).rejects.toThrow('Network error');
    });

    expect(result.current.passwordCredentialStatus).toBe('error');
  });

  it('creates password credential successfully and refreshes status', async () => {
    mocks.createCurrentUserPassword.mockResolvedValue(undefined);
    mocks.checkCurrentUserHasPassword.mockResolvedValue(true);

    const { result } = renderHook(() => usePasswordCredentials());

    await act(async () => {
      await result.current.createPasswordCredential('StrongPassword123!', 'StrongPassword123!');
    });

    expect(mocks.createCurrentUserPassword).toHaveBeenCalled();
    expect(result.current.passwordCredentialStatus).toBe('configured');
  });

  it('resets status to idle when resetPasswordCredentialStatus is called', () => {
    const { result } = renderHook(() => usePasswordCredentials());

    act(() => {
      result.current.setPasswordCredentialStatus('configured');
    });
    expect(result.current.passwordCredentialStatus).toBe('configured');

    act(() => {
      result.current.resetPasswordCredentialStatus();
    });
    expect(result.current.passwordCredentialStatus).toBe('idle');
  });
});
