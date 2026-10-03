// @vitest-environment happy-dom
import React from 'react';
import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  onAuthStateChange: vi.fn(),
  signOut: vi.fn(),
  from: vi.fn(),
  unsubscribe: vi.fn(),
  checkPassword: vi.fn(),
}));
vi.mock('@/pages/utils/supabaseConfig', () => ({ supabase: { auth: mocks, from: mocks.from } }));
vi.mock('@/services/authPasswordSetup', () => ({
  checkCurrentUserHasPassword: mocks.checkPassword,
  createCurrentUserPassword: vi.fn(),
}));
import { AuthProvider, useAuth } from './AuthContext';

const session = { user: { id: 'TEST_AUT_session', email: 'test@example.invalid', user_metadata: {} } };
const Probe = () => {
  const auth = useAuth();
  return <div>{auth.loading ? 'restoring' : auth.isAuthenticated ? 'authenticated' : 'signed-out'}</div>;
};

beforeEach(() => {
  vi.useFakeTimers();
  mocks.getSession.mockImplementation(() => new Promise(() => {}));
  mocks.onAuthStateChange.mockReturnValue({ data: { subscription: { unsubscribe: mocks.unsubscribe } } });
  mocks.signOut.mockResolvedValue({ error: null });
  mocks.checkPassword.mockResolvedValue(true);
  const query = { select: vi.fn(), eq: vi.fn(), ilike: vi.fn(), maybeSingle: vi.fn() };
  query.select.mockReturnValue(query);
  query.eq.mockReturnValue(query);
  query.ilike.mockResolvedValue({ data: [{ id: 'TEST_AUT_employee' }] });
  query.maybeSingle.mockResolvedValue({ data: { id: session.user.id, role: 'seller' } });
  mocks.from.mockReturnValue(query);
});
afterEach(() => { cleanup(); vi.useRealTimers(); vi.clearAllMocks(); });

describe('session restoration', () => {
  it('waits for a slow refresh instead of treating five seconds as logout', async () => {
    let resolveSession!: (value: { data: { session: typeof session } }) => void;
    mocks.getSession.mockReturnValue(new Promise((resolve) => { resolveSession = resolve; }));
    render(<AuthProvider><Probe /></AuthProvider>);
    await act(async () => { await vi.advanceTimersByTimeAsync(6000); });
    expect(screen.getByText('restoring')).toBeTruthy();
    await act(async () => { resolveSession({ data: { session } }); });
    expect(screen.getByText('authenticated')).toBeTruthy();
  });

  it('defers Supabase requests until the auth event releases its lock', async () => {
    render(<AuthProvider><Probe /></AuthProvider>);
    const callback = mocks.onAuthStateChange.mock.calls[0][0];
    act(() => { callback('INITIAL_SESSION', session); });
    expect(mocks.from).not.toHaveBeenCalled();
    await act(async () => { await vi.advanceTimersByTimeAsync(0); });
    expect(screen.getByText('authenticated')).toBeTruthy();
  });

  it('shows login when the restored session really is absent', async () => {
    mocks.getSession.mockResolvedValue({ data: { session: null } });
    await act(async () => { render(<AuthProvider><Probe /></AuthProvider>); });
    expect(screen.getByText('signed-out')).toBeTruthy();
  });

  it('keeps an authenticated user when the access token is refreshed', async () => {
    mocks.getSession.mockResolvedValue({ data: { session } });
    await act(async () => { render(<AuthProvider><Probe /></AuthProvider>); });
    const callback = mocks.onAuthStateChange.mock.calls[0][0];
    act(() => { callback('TOKEN_REFRESHED', session); });
    await act(async () => { await vi.advanceTimersByTimeAsync(0); });
    expect(screen.getByText('authenticated')).toBeTruthy();
  });
});
