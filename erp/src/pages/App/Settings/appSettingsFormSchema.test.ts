import { describe, expect, it } from 'vitest';
import { AppSettingsFormSchema } from '../../../../../shared-utils/appSettingsFormSchema';
import { getDefaultSettings } from '@/pages/utils/settings/defaults';

describe('shared settings form contract', () => {
  it('accepts current defaults and preserves optional section metadata', () => {
    const settings = { ...getDefaultSettings(), customPreference: 'preserved' };
    expect(AppSettingsFormSchema.parse(settings).customPreference).toBe('preserved');
  });
  it('blocks non-finite numbers and unsupported static options', () => {
    const settings = getDefaultSettings();
    expect(AppSettingsFormSchema.safeParse({ ...settings, freightPerKm: Infinity }).success).toBe(false);
    expect(AppSettingsFormSchema.safeParse({ ...settings, defaultTheme: 'unsupported' }).success).toBe(false);
    expect(AppSettingsFormSchema.safeParse({ ...settings, nfeEnvironment: 3 }).success).toBe(false);
  });

  it('accepts only public app paths or HTTPS URLs for the DANFE NFC-e logo', () => {
    const settings = getDefaultSettings();
    expect(AppSettingsFormSchema.safeParse({ ...settings, companyDanfeLogoUrl: '/images/custom.svg' }).success).toBe(true);
    expect(AppSettingsFormSchema.safeParse({ ...settings, companyDanfeLogoUrl: 'https://assets.example/logo.svg' }).success).toBe(true);
    expect(AppSettingsFormSchema.safeParse({ ...settings, companyDanfeLogoUrl: 'javascript:alert(1)' }).success).toBe(false);
    expect(AppSettingsFormSchema.safeParse({ ...settings, companyDanfeLogoUrl: '//assets.example/logo.svg' }).success).toBe(false);
  });
});
