import { beforeEach, describe, expect, it, vi } from 'vitest';

const upsert = vi.fn(async () => ({ error: null }));
vi.mock('@/pages/utils/supabaseConfig', () => ({
  supabase: { from: () => ({ upsert }) },
}));

import { getSettings, saveSettings } from '../settingsService';

describe('credenciais fiscais em configurações compartilhadas', () => {
  const values = new Map<string, string>();

  beforeEach(() => {
    values.clear();
    upsert.mockClear();
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
    });
  });

  it('remove credenciais legadas do armazenamento local ao carregar e não as reenvia ao banco', async () => {
    values.set(
      'pdv_app_settings',
      JSON.stringify({
        companyCnpj: '44512248000107',
        certificateBase64: 'legacy-pfx',
        certificatePassword: 'legacy-password',
        certificateFileName: 'legacy.pfx',
        cscToken: 'legacy-csc',
      })
    );

    const settings = getSettings();
    expect(values.get('pdv_app_settings')).not.toMatch(/legacy-pfx|legacy-password|legacy-csc/);
    await saveSettings(settings);

    const savedData = upsert.mock.calls[0][0].data;
    expect(savedData.companyCnpj).toBe('44512248000107');
    for (const key of ['certificateBase64', 'certificatePassword', 'certificateFileName', 'cscToken']) {
      expect(savedData).not.toHaveProperty(key);
    }
  });
});
