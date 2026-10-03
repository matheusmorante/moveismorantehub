import { describe, expect, it } from 'vitest';
import { getSupabaseBackendKey } from '../../../../../../api/nfe/supabaseBackendKey';

describe('getSupabaseBackendKey', () => {
  it('prefers the Supabase Secret Key over the legacy service role key', () => {
    expect(
      getSupabaseBackendKey({
        SUPABASE_SECRET_KEY: ' sb_secret_preview_test ',
        SUPABASE_SERVICE_ROLE_KEY: 'legacy-service-role-test',
      })
    ).toBe('sb_secret_preview_test');
  });

  it('falls back to the legacy service role key when no Secret Key is configured', () => {
    expect(getSupabaseBackendKey({ SUPABASE_SERVICE_ROLE_KEY: 'legacy-service-role-test' })).toBe(
      'legacy-service-role-test'
    );
  });

  it('treats a blank Secret Key as missing and falls back to the legacy key', () => {
    expect(
      getSupabaseBackendKey({
        SUPABASE_SECRET_KEY: '  ',
        SUPABASE_SERVICE_ROLE_KEY: 'legacy-service-role-test',
      })
    ).toBe('legacy-service-role-test');
  });
});
