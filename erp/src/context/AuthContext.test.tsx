// @vitest-environment happy-dom
import React from 'react';
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  authListener: null as ((event: string, session: any) => unknown) | null,
  getSession: vi.fn(),
  onAuthStateChange: vi.fn(),
  from: vi.fn(),
  signOut: vi.fn(),
  checkCurrentUserHasPassword: vi.fn(),
  createCurrentUserPassword: vi.fn(),
  verifyConfiguredTestArtifactOperator: vi.fn(),
}));

vi.mock('@/pages/utils/supabaseConfig', () => ({
  supabase: {
    auth: {
      getSession: (...args: unknown[]) => mocks.getSession(...args),
      onAuthStateChange: (...args: unknown[]) => mocks.onAuthStateChange(...args),
      signOut: (...args: unknown[]) => mocks.signOut(...args),
    },
    from: (...args: unknown[]) => mocks.from(...args),
  },
}));

vi.mock('@/services/authPasswordSetup', () => ({
  checkCurrentUserHasPassword: (...args: unknown[]) =>
    mocks.checkCurrentUserHasPassword(...args),
  createCurrentUserPassword: (...args: unknown[]) => mocks.createCurrentUserPassword(...args),
}));

vi.mock('@/services/testArtifactOperator', () => ({
  verifyConfiguredTestArtifactOperator: (...args: unknown[]) =>
    mocks.verifyConfiguredTestArtifactOperator(...args),
}));

vi.mock('@/lib/queryClient', () => ({ queryClient: { clear: vi.fn() } }));

vi.mock('../../../shared-utils/testArtifactContext', () => ({
  bindTestArtifactContext: vi.fn(),
  clearTestArtifactContext: vi.fn(),
  testArtifactIdentityForAuthenticatedUser: vi.fn(() => null),
}));

import { AuthProvider, useAuth } from './AuthContext';

let resolveProfile: (result: { data: unknown; error: null }) => void;
let profileQuery: Promise<{ data: unknown; error: null }>;

const operatorSession = {
  user: {
    id: 'operator-id',
    email: 'operator@example.invalid',
    user_metadata: {},
    app_metadata: {},
  },
};

const adminProfile = {
  id: 'operator-id',
  email: 'operator@example.invalid',
  role: 'administrator',
  roles: ['administrator'],
  full_name: 'Synthetic Operator',
};

function AuthStatus() {
  const { isAdministrator, isPending, loading, user } = useAuth();
  const state = loading
    ? 'loading'
    : !user
      ? 'signed-out'
      : isPending
        ? 'pending'
        : isAdministrator
          ? 'ready'
          : 'unknown';

  return <output data-testid="auth-state">{state}</output>;
}

function setUpSupabaseMocks() {
  profileQuery = new Promise((resolve) => {
    resolveProfile = resolve;
  });

  mocks.getSession.mockResolvedValue({ data: { session: null } });
  mocks.onAuthStateChange.mockImplementation((listener) => {
    mocks.authListener = listener;
    return { data: { subscription: { unsubscribe: vi.fn() } } };
  });
  mocks.checkCurrentUserHasPassword.mockResolvedValue(true);
  mocks.createCurrentUserPassword.mockResolvedValue(undefined);
  mocks.signOut.mockResolvedValue({ error: null });
  mocks.from.mockImplementation((table: string) => {
    const builder: Record<string, any> = {};
    builder.select = vi.fn(() => builder);
    builder.eq = vi.fn(() => builder);
    builder.ilike = vi.fn(() => builder);
    builder.maybeSingle = vi.fn(() => (table === 'profiles' ? profileQuery : Promise.resolve({ data: null, error: null })));
    builder.limit = vi.fn(() =>
      Promise.resolve({
        data: [{ id: 'employee-id', email: 'operator@example.invalid', full_name: 'Synthetic Operator' }],
        error: null,
      })
    );
    builder.update = vi.fn(() => builder);
    builder.insert = vi.fn(() => Promise.resolve({ error: null }));
    return builder;
  });
}

async function mountSignedOutProvider() {
  render(
    <AuthProvider>
      <AuthStatus />
    </AuthProvider>
  );

  await waitFor(() => expect(mocks.authListener).toBeTypeOf('function'));
  await waitFor(() => expect(screen.getByTestId('auth-state').textContent).toBe('signed-out'));
}

async function signInWhileProfileIsUnresolved() {
  await act(async () => {
    mocks.authListener?.('SIGNED_IN', operatorSession);
  });
}

afterEach(cleanup);

beforeEach(() => {
  vi.clearAllMocks();
  mocks.authListener = null;
  setUpSupabaseMocks();
});

describe('AuthProvider profile resolution', () => {
  it('keeps a new session loading until the administrator profile resolves', async () => {
    await mountSignedOutProvider();

    await signInWhileProfileIsUnresolved();

    expect(screen.getByTestId('auth-state').textContent).toBe('loading');

    await act(async () => {
      resolveProfile({ data: adminProfile, error: null });
    });

    await waitFor(() => expect(screen.getByTestId('auth-state').textContent).toBe('ready'));
  });

  it('still shows approval required after a resolved profile has a pending role', async () => {
    await mountSignedOutProvider();

    await signInWhileProfileIsUnresolved();
    expect(screen.getByTestId('auth-state').textContent).toBe('loading');

    await act(async () => {
      resolveProfile({
        data: { ...adminProfile, role: 'pending', roles: [] },
        error: null,
      });
    });

    await waitFor(() => expect(screen.getByTestId('auth-state').textContent).toBe('pending'));
  });
});
