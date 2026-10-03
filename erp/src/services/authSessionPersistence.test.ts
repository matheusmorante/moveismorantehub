// @vitest-environment happy-dom
import { createClient } from '@supabase/supabase-js';
import { afterEach, describe, expect, it, vi } from 'vitest';

const storageKey = 'TEST_AUT_persistent_auth';
const user = { id: 'TEST_AUT_session_user', email: 'test@example.invalid' };
const makeSession = (expiresAt: number) => ({
  access_token: `e30.${btoa(JSON.stringify({ exp: expiresAt, sub: user.id, session_id: 'TEST_AUT_session' }))}.test`,
  refresh_token: 'TEST_AUT_refresh_token',
  token_type: 'bearer',
  expires_in: 3600,
  expires_at: expiresAt,
  user,
});

afterEach(() => { localStorage.removeItem(storageKey); });

describe('Supabase SDK session persistence (isolated Auth transport)', () => {
  it('restores persisted login after the previous client is closed', async () => {
    const session = makeSession(Math.floor(Date.now() / 1000) + 3600);
    localStorage.setItem(storageKey, JSON.stringify(session));
    const fetch = vi.fn();
    const options = {
      auth: { storage: localStorage, storageKey, persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
      global: { fetch },
    };
    const first = createClient('https://auth.example.invalid', 'test-anon-key', options);
    expect((await first.auth.getSession()).data.session?.user.id).toBe(user.id);
    await first.auth.stopAutoRefresh();
    const reopened = createClient('https://auth.example.invalid', 'test-anon-key', options);
    try {
      expect((await reopened.auth.getSession()).data.session?.user.id).toBe(user.id);
      expect(fetch).not.toHaveBeenCalled();
    } finally { await reopened.auth.stopAutoRefresh(); }
  });

  it('renews an expired access token from persisted storage without another login', async () => {
    const now = Math.floor(Date.now() / 1000);
    localStorage.setItem(storageKey, JSON.stringify(makeSession(now - 60)));
    const renewed = makeSession(now + 3600);
    const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify(renewed), {
      status: 200, headers: { 'Content-Type': 'application/json' },
    }));
    const client = createClient('https://auth.example.invalid', 'test-anon-key', {
      auth: { storage: localStorage, storageKey, persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
      global: { fetch },
    });
    try {
      const { data, error } = await client.auth.getSession();
      expect(error).toBeNull();
      expect(data.session?.access_token).toBe(renewed.access_token);
      expect(JSON.parse(localStorage.getItem(storageKey)!).access_token).toBe(renewed.access_token);
      expect(String(fetch.mock.calls[0][0])).toContain('/auth/v1/token?grant_type=refresh_token');
      expect(fetch).toHaveBeenCalledOnce();
    } finally { await client.auth.stopAutoRefresh(); }
  });

  it('clears persisted login when Auth confirms that the session has expired', async () => {
    localStorage.setItem(storageKey, JSON.stringify(makeSession(Math.floor(Date.now() / 1000) - 60)));
    const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      code: 'session_expired', message: 'Session exceeded its configured lifetime',
    }), { status: 400, headers: { 'Content-Type': 'application/json', 'X-Supabase-Api-Version': '2024-01-01' } }));
    const client = createClient('https://auth.example.invalid', 'test-anon-key', {
      auth: { storage: localStorage, storageKey, persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
      global: { fetch },
    });
    try {
      expect((await client.auth.getSession()).data.session).toBeNull();
      expect(localStorage.getItem(storageKey)).toBeNull();
    } finally { await client.auth.stopAutoRefresh(); }
  });
});
