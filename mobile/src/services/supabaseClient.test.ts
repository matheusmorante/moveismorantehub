import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  platform: { OS: 'android' },
  appState: { currentState: 'active', addEventListener: vi.fn() },
  storage: { getItem: vi.fn(), setItem: vi.fn(), removeItem: vi.fn() },
  auth: { startAutoRefresh: vi.fn(), stopAutoRefresh: vi.fn() },
  processLock: vi.fn(),
  createClient: vi.fn(),
  remove: vi.fn(),
}));
vi.mock('react-native', () => ({ Platform: mocks.platform, AppState: mocks.appState }));
vi.mock('@react-native-async-storage/async-storage', () => ({ default: mocks.storage }));
vi.mock('@supabase/supabase-js', () => ({ createClient: mocks.createClient, processLock: mocks.processLock }));

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  mocks.platform.OS = 'android';
  mocks.appState.currentState = 'active';
  mocks.appState.addEventListener.mockReturnValue({ remove: mocks.remove });
  mocks.createClient.mockReturnValue({ auth: mocks.auth });
});

describe('persistent mobile authentication', () => {
  it('stores the native session in AsyncStorage and serializes refreshes', async () => {
    await import('./supabaseClient');
    expect(mocks.createClient.mock.calls[0][2].auth).toMatchObject({
      storage: mocks.storage, lock: mocks.processLock,
      persistSession: true, autoRefreshToken: true, detectSessionInUrl: false,
    });
  });

  it('restarts token renewal on return from the background and removes the listener', async () => {
    const { startMobileAuthRefresh } = await import('./supabaseClient');
    const stop = startMobileAuthRefresh();
    expect(mocks.auth.startAutoRefresh).toHaveBeenCalledTimes(1);
    const onChange = mocks.appState.addEventListener.mock.calls[0][1];
    onChange('background');
    expect(mocks.auth.stopAutoRefresh).toHaveBeenCalledTimes(1);
    onChange('active');
    expect(mocks.auth.startAutoRefresh).toHaveBeenCalledTimes(2);
    stop();
    expect(mocks.remove).toHaveBeenCalledOnce();
    expect(mocks.auth.stopAutoRefresh).toHaveBeenCalledTimes(2);
  });

  it('does not start background renewal if the native app is initially inactive', async () => {
    mocks.appState.currentState = 'background';
    const { startMobileAuthRefresh } = await import('./supabaseClient');
    startMobileAuthRefresh();
    expect(mocks.auth.startAutoRefresh).not.toHaveBeenCalled();
    expect(mocks.auth.stopAutoRefresh).toHaveBeenCalledOnce();
  });

  it('preserves browser storage and lets Supabase handle browser visibility', async () => {
    mocks.platform.OS = 'web';
    const { startMobileAuthRefresh } = await import('./supabaseClient');
    startMobileAuthRefresh()();
    expect(mocks.createClient.mock.calls[0][2].auth).toMatchObject({
      storage: undefined, persistSession: true, autoRefreshToken: true, detectSessionInUrl: true,
    });
    expect(mocks.createClient.mock.calls[0][2].auth.lock).toBeUndefined();
    expect(mocks.appState.addEventListener).not.toHaveBeenCalled();
    expect(mocks.auth.startAutoRefresh).not.toHaveBeenCalled();
    expect(mocks.auth.stopAutoRefresh).not.toHaveBeenCalled();
  });
});
