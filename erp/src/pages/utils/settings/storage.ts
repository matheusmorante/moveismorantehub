import { useState, useEffect } from 'react';
import { supabase } from '@/pages/utils/supabaseConfig';
import { AppSettings } from './types';
import { getDefaultSettings, SETTINGS_KEY, SETTINGS_ID, SUPABASE_SETTINGS_TABLE } from './defaults';
import { migrateSettings } from './migrations';
import { withTimeout } from '../../../../../shared-utils/withTimeout';

/**
 * Helper to deep merge objects
 */
export const deepMerge = (target: any, source: any) => {
  if (!source) return target;
  const output = { ...target };

  Object.keys(source).forEach((key) => {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      if (!(key in target)) {
        output[key] = source[key];
      } else {
        output[key] = deepMerge(target[key], source[key]);
      }
    } else {
      output[key] = source[key];
    }
  });

  return output;
};

/**
 * Carrega configurações mesclando defaults, localStorage e migrações
 */
export const getSettings = (): AppSettings => {
  const defaults = getDefaultSettings();
  let saved: string | null;
  try { saved = localStorage.getItem(SETTINGS_KEY); } catch { return defaults; }

  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      const hadLegacyFiscalSecrets =
        parsed &&
        ['certificateBase64', 'certificatePassword', 'certificateFileName', 'cscToken'].some(
          (key) => Object.prototype.hasOwnProperty.call(parsed, key)
        );
      const migrated = migrateSettings(parsed);
      if (hadLegacyFiscalSecrets) localStorage.setItem(SETTINGS_KEY, JSON.stringify(migrated));
      return deepMerge(defaults, migrated);
    } catch {
      return defaults;
    }
  }
  return defaults;
};

const settingsSubscribers = new Set<(settings: AppSettings) => void>();
let settingsRevision = 0;

export const notifySettingsSubscribers = (settings: AppSettings) => {
  settingsRevision++;
  settingsSubscribers.forEach((cb) => {
    try {
      cb(settings);
    } catch (e) {
      console.error('Erro ao notificar subscriber de configurações:', e);
    }
  });
};

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === SETTINGS_KEY) {
      notifySettingsSubscribers(getSettings());
    }
  });
}

/**
 * Inicialização e assinatura de configurações com Supabase
 */
export const subscribeToSettings = (callback: (settings: AppSettings) => void) => {
  settingsSubscribers.add(callback);
  const defaults = getDefaultSettings();
  // Initial load from localStorage for speed
  callback(getSettings());

  // Initial load from Supabase
  let active = true; const revision = settingsRevision;
  void withTimeout(supabase
    .from(SUPABASE_SETTINGS_TABLE)
    .select('data')
    .eq('id', SETTINGS_ID)
    .single(), 15_000, null, 'configuracoes:consultar')
    .then((response) => {
      if (!active || revision !== settingsRevision) return;
      const { data, error } = response || {};
      if (data && !error) {
        const settingsFromCloud = data.data as any;
        const migrated = migrateSettings(settingsFromCloud);
        const mergedSettings = deepMerge(defaults, migrated);
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(mergedSettings));
        notifySettingsSubscribers(mergedSettings);
      }
    }).catch(() => { /* Preserve the initial local snapshot when cloud/cache fails. */ });

  return () => {
    active = false;
    settingsSubscribers.delete(callback);
  };
};

/**
 * Persiste configurações no localStorage (local-first) e na nuvem (Supabase)
 */
export function saveSettings(settings: AppSettings): Promise<void>;
export function saveSettings(settings: AppSettings, options: { confirm: true; isCurrent?: () => boolean }): Promise<{ confirmed: boolean; cached: boolean }>;
export async function saveSettings(settings: AppSettings, options?: { confirm: true; isCurrent?: () => boolean }): Promise<void | { confirmed: boolean; cached: boolean }> {
  const safeSettings = migrateSettings({ ...settings });
  if (options?.confirm) {
    const current = options.isCurrent ?? (() => true);
    if (!current()) return { confirmed: false, cached: false };
    settingsRevision++;
    const uncertain = () => Object.assign(new Error('A configuração não foi confirmada. Recarregue e confira antes de repetir.'), { uncertain: true });
    let response;
    try {
      response = await withTimeout(supabase.from(SUPABASE_SETTINGS_TABLE).upsert({ id: SETTINGS_ID, data: safeSettings }).select('id,data').single(), 20_000, null, 'configuracoes:salvar-confirmado');
    } catch { throw uncertain(); }
    if (!response || response.status === 0) throw uncertain();
    if (response.error) {
      const code = response.error.code;
      if (!code || code.startsWith('08') || ['40003', 'PGRST116'].includes(code)) throw uncertain();
      throw new Error('Não foi possível salvar a configuração na nuvem. Confira as permissões.');
    }
    const canonical = (value: unknown) => JSON.stringify(value, (_key, entry) => entry && typeof entry === 'object' && !Array.isArray(entry)
      ? Object.fromEntries(Object.entries(entry).sort(([left], [right]) => left < right ? -1 : left > right ? 1 : 0)) : entry);
    if (response.data?.id !== SETTINGS_ID || canonical(response.data?.data) !== canonical(safeSettings)) throw uncertain();
    if (!current()) return { confirmed: false, cached: false };
    let cached = false;
    try { const serialized = JSON.stringify(safeSettings); localStorage.setItem(SETTINGS_KEY, serialized); cached = localStorage.getItem(SETTINGS_KEY) === serialized; } catch { /* Cloud confirmation remains authoritative. */ }
    notifySettingsSubscribers(safeSettings);
    return { confirmed: true, cached };
  }
  // 1. Save to localStorage (Local First)
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(safeSettings));
  notifySettingsSubscribers(safeSettings);

  // 2. Save to Supabase (Cloud Persistence)
  try {
    const { error } = await supabase
      .from(SUPABASE_SETTINGS_TABLE)
      .upsert({ id: SETTINGS_ID, data: safeSettings });

    if (error) throw error;
  } catch (error) {
    console.error('Erro ao persistir configurações no Supabase:', error);
  }
}

/**
 * Hook React para obter configurações sincronizadas e reativas
 */
export const useSettings = (): AppSettings => {
  const [settings, setSettings] = useState<AppSettings>(() => getSettings());

  useEffect(() => {
    return subscribeToSettings((newSettings) => {
      setSettings(newSettings);
    });
  }, []);

  return settings;
};
