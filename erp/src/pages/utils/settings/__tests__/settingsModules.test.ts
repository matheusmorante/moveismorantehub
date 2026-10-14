import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getDefaultSettings, SETTINGS_KEY, SETTINGS_ID } from '../defaults';
import { migrateSettings } from '../migrations';
import { deepMerge, getSettings, saveSettings } from '../storage';

const upsertMock = vi.fn(async () => ({ error: null }));
vi.mock('@/pages/utils/supabaseConfig', () => ({
  supabase: {
    from: () => ({
      upsert: upsertMock,
      select: () => ({
        eq: () => ({
          single: async () => ({ data: null, error: null }),
        }),
      }),
    }),
  },
}));

describe('settings modular architecture', () => {
  const store = new Map<string, string>();

  beforeEach(() => {
    store.clear();
    upsertMock.mockClear();
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => store.set(key, value),
      removeItem: (key: string) => store.delete(key),
      clear: () => store.clear(),
    });
  });

  describe('defaults', () => {
    it('retorna configurações padrão válidas e completas', () => {
      const defaults = getDefaultSettings();
      expect(defaults).toBeDefined();
      expect(defaults.companyName).toBe('Móveis Morante');
      expect(defaults.orderStatuses.length).toBeGreaterThan(0);
      expect(defaults.whatsappConfig).toBeDefined();
      expect(defaults.aiPrompts).toBeDefined();
      expect(defaults.cardFlagRules.length).toBeGreaterThan(0);
      expect(SETTINGS_KEY).toBe('pdv_app_settings');
      expect(SETTINGS_ID).toBe('app');
    });
  });

  describe('migrations', () => {
    it('remove credenciais fiscais legadas', () => {
      const input = {
        companyCnpj: '44512248000107',
        certificateBase64: 'secret-base64',
        certificatePassword: 'secret-password',
        certificateFileName: 'cert.pfx',
        cscToken: 'secret-csc',
      };
      const migrated = migrateSettings(input);
      expect(migrated.companyCnpj).toBe('44512248000107');
      expect(migrated).not.toHaveProperty('certificateBase64');
      expect(migrated).not.toHaveProperty('certificatePassword');
      expect(migrated).not.toHaveProperty('certificateFileName');
      expect(migrated).not.toHaveProperty('cscToken');
    });

    it('migra manuseio de string[] para HandlingOption[]', () => {
      const input = {
        deliveryHandlingOptions: ['Entrega padrão', 'Montagem no local'],
        pickupHandlingOptions: ['Retirada loja'],
      };
      const migrated = migrateSettings(input);
      expect(Array.isArray(migrated.deliveryHandlingOptions)).toBe(true);
      expect(typeof migrated.deliveryHandlingOptions[0]).toBe('object');
      expect(migrated.deliveryHandlingOptions[0]).toHaveProperty('label');
      expect(migrated.deliveryHandlingOptions[0]).toHaveProperty('includeInAssemblySchedule');
    });

    it('atualiza rolePermissions para a versão mais recente', () => {
      const input = {
        rolePermissions: {},
        rolePermissionsMigrationVersion: 0,
      };
      const migrated = migrateSettings(input);
      expect(migrated.rolePermissionsMigrationVersion).toBe(8);
      expect(migrated.rolePermissions).toBeDefined();
      expect(migrated.rolePermissions?.viewFiscal).toContain('accountant');
    });
  });

  describe('storage', () => {
    it('realiza deepMerge corretamente sem sobrescrever chaves aninhadas com undefined', () => {
      const target = { a: 1, b: { c: 2, d: 3 } };
      const source = { b: { c: 20 }, e: 4 };
      const result = deepMerge(target, source);
      expect(result).toEqual({ a: 1, b: { c: 20, d: 3 }, e: 4 });
    });

    it('retorna defaults quando localStorage está vazio', () => {
      const settings = getSettings();
      expect(settings.companyName).toBe('Móveis Morante');
    });

    it('persiste no localStorage e salva no Supabase', async () => {
      const current = getSettings();
      current.companyPhone = '(41) 99999-9999';
      await saveSettings(current);

      const savedLocal = JSON.parse(store.get(SETTINGS_KEY) || '{}');
      expect(savedLocal.companyPhone).toBe('(41) 99999-9999');
      expect(upsertMock).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'app',
          data: expect.objectContaining({ companyPhone: '(41) 99999-9999' }),
        })
      );
    });
  });
});
