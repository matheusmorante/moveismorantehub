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
  getTestArtifactContext: vi.fn(),
  bindTestArtifactContext: vi.fn(),
  testArtifactIdentityForAuthenticatedUser: vi.fn((..._args: unknown[]) => null),
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
  bindTestArtifactContext: (...args: unknown[]) => mocks.bindTestArtifactContext(...args),
  clearTestArtifactContext: vi.fn(),
  getTestArtifactContext: () => mocks.getTestArtifactContext(),
  testArtifactIdentityForAuthenticatedUser: (...args: unknown[]) =>
    mocks.testArtifactIdentityForAuthenticatedUser(...args),
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

let currentAuth: ReturnType<typeof useAuth>;
function AuthStatus() {
  currentAuth = useAuth();
  const { isAdministrator, isPending, loading, user } = currentAuth;
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

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllEnvs();
});

beforeEach(() => {
  vi.clearAllMocks();
  mocks.authListener = null;
  mocks.getTestArtifactContext.mockReturnValue(null);
  mocks.verifyConfiguredTestArtifactOperator.mockResolvedValue(false);
  vi.stubEnv('DEV', true);
  vi.stubEnv('VITE_TEST_ARTIFACT_RUN_ID', undefined);
  vi.stubEnv('VITE_TEST_ARTIFACT_SCENARIO_KEY', undefined);
  setUpSupabaseMocks();
});

describe('AuthProvider profile resolution', () => {
  it('limita a espera de saída sem limpar a conta por uma resposta tardia', async () => {
    await mountSignedOutProvider(); await signInWhileProfileIsUnresolved();
    await act(async () => resolveProfile({ data: adminProfile, error: null }));
    await waitFor(() => expect(screen.getByTestId('auth-state').textContent).toBe('ready'));
    vi.useFakeTimers(); vi.spyOn(console, 'warn').mockImplementation(() => {});
    let finish!: (value: unknown) => void; mocks.signOut.mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; }));
    const outcome = currentAuth.logout().catch((error: Error) => error);
    await act(async () => { await vi.advanceTimersByTimeAsync(20_001); });
    expect(await outcome).toEqual(expect.objectContaining({ message: expect.stringContaining('Confira o estado da sua conta') }));
    await act(async () => { finish({ error: null }); }); expect(screen.getByTestId('auth-state').textContent).toBe('ready'); expect(mocks.signOut).toHaveBeenCalledTimes(1);
  });
  it('preserva a conta quando signOut devolve erro e permite saída confirmada depois', async () => {
    await mountSignedOutProvider(); await signInWhileProfileIsUnresolved();
    await act(async () => resolveProfile({ data: adminProfile, error: null }));
    await waitFor(() => expect(screen.getByTestId('auth-state').textContent).toBe('ready'));
    mocks.signOut.mockResolvedValueOnce({ error: { message: 'Saída recusada' } });
    await act(async () => { await expect(currentAuth.logout()).rejects.toThrow('Saída recusada'); });
    expect(screen.getByTestId('auth-state').textContent).toBe('ready');
    await act(async () => { await currentAuth.logout(); }); expect(screen.getByTestId('auth-state').textContent).toBe('signed-out');
  });
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
    expect(mocks.verifyConfiguredTestArtifactOperator).not.toHaveBeenCalled();
  });

  it('creates a test execution only after administrator and backend authorization, without an env runId', async () => {
    mocks.verifyConfiguredTestArtifactOperator.mockResolvedValue(true);
    await mountSignedOutProvider();
    await signInWhileProfileIsUnresolved();
    expect(mocks.verifyConfiguredTestArtifactOperator).not.toHaveBeenCalled();
    await act(async () => resolveProfile({ data: adminProfile, error: null }));
    await waitFor(() => expect(screen.getByTestId('auth-state').textContent).toBe('ready'));
    expect(mocks.testArtifactIdentityForAuthenticatedUser).toHaveBeenCalledWith(
      expect.objectContaining({
        runId: expect.stringMatching(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i),
        ownerId: operatorSession.user.id,
        isAdministrator: true,
        configuredOperatorAuthorized: true,
      }),
    );
  });

  it('preserves the existing execution belonging to the authenticated operator', async () => {
    mocks.verifyConfiguredTestArtifactOperator.mockResolvedValue(true);
    await mountSignedOutProvider();
    const runId = '550e8400-e29b-41d4-a716-446655440000';
    mocks.getTestArtifactContext.mockReturnValue({ runId, ownerId: operatorSession.user.id });
    await signInWhileProfileIsUnresolved();
    await act(async () => resolveProfile({ data: adminProfile, error: null }));
    await waitFor(() => expect(screen.getByTestId('auth-state').textContent).toBe('ready'));
    expect(mocks.testArtifactIdentityForAuthenticatedUser).toHaveBeenCalledWith(
      expect.objectContaining({ runId, configuredOperatorAuthorized: true }),
    );
  });

  it('never reuses another operators execution', async () => {
    mocks.verifyConfiguredTestArtifactOperator.mockResolvedValue(true);
    await mountSignedOutProvider();
    const otherRunId = '550e8400-e29b-41d4-a716-446655440001';
    mocks.getTestArtifactContext.mockReturnValue({ runId: otherRunId, ownerId: 'another-operator' });
    await signInWhileProfileIsUnresolved();
    await act(async () => resolveProfile({ data: adminProfile, error: null }));
    await waitFor(() => expect(screen.getByTestId('auth-state').textContent).toBe('ready'));
    expect(mocks.testArtifactIdentityForAuthenticatedUser)
      .not.toHaveBeenLastCalledWith(expect.objectContaining({ runId: otherRunId }));
  });

  it('does not create or bind a test execution when backend authorization fails', async () => {
    await mountSignedOutProvider();
    await signInWhileProfileIsUnresolved();
    await act(async () => resolveProfile({ data: adminProfile, error: null }));
    await waitFor(() => expect(screen.getByTestId('auth-state').textContent).toBe('ready'));
    expect(mocks.testArtifactIdentityForAuthenticatedUser).toHaveBeenCalledWith(
      expect.objectContaining({ runId: undefined, configuredOperatorAuthorized: false }),
    );
    expect(mocks.bindTestArtifactContext).not.toHaveBeenCalled();
  });

  it('keeps test context disabled in production even for an administrator', async () => {
    vi.stubEnv('DEV', false);
    mocks.verifyConfiguredTestArtifactOperator.mockResolvedValue(true);
    await mountSignedOutProvider();
    await signInWhileProfileIsUnresolved();
    await act(async () => resolveProfile({ data: adminProfile, error: null }));
    await waitFor(() => expect(screen.getByTestId('auth-state').textContent).toBe('ready'));
    expect(mocks.verifyConfiguredTestArtifactOperator).not.toHaveBeenCalled();
    expect(mocks.testArtifactIdentityForAuthenticatedUser).toHaveBeenCalledWith(
      expect.objectContaining({ isDevelopment: false, configuredOperatorAuthorized: false }),
    );
    expect(mocks.bindTestArtifactContext).not.toHaveBeenCalled();
  });
});
