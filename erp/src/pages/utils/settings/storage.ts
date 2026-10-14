import { supabase } from '@/pages/utils/supabaseConfig';
import { AppSettings } from './types';
import { getDefaultSettings, SETTINGS_KEY, SETTINGS_ID, SUPABASE_SETTINGS_TABLE } from './defaults';
import { migrateSettings } from './migrations';

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
  const saved = localStorage.getItem(SETTINGS_KEY);
  const defaults = getDefaultSettings();

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

/**
 * Inicialização e assinatura de configurações com Supabase
 */
export const subscribeToSettings = (callback: (settings: AppSettings) => void) => {
  const defaults = getDefaultSettings();
  // Initial load from localStorage for speed
  callback(getSettings());

  // Initial load from Supabase
  supabase
    .from(SUPABASE_SETTINGS_TABLE)
    .select('data')
    .eq('id', SETTINGS_ID)
    .single()
    .then(({ data, error }: { data: any; error: any }) => {
      if (data && !error) {
        const settingsFromCloud = data.data as any;
        const migrated = migrateSettings(settingsFromCloud);
        const mergedSettings = deepMerge(defaults, migrated);
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(mergedSettings));
        callback(mergedSettings);
      }
    });

  return () => {
    // Realtime desabilitado para economizar conexões e tráfego
  };
};

/**
 * Persiste configurações no localStorage (local-first) e na nuvem (Supabase)
 */
export const saveSettings = async (settings: AppSettings) => {
  const safeSettings = migrateSettings({ ...settings });
  // 1. Save to localStorage (Local First)
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(safeSettings));

  // 2. Save to Supabase (Cloud Persistence)
  try {
    const { error } = await supabase
      .from(SUPABASE_SETTINGS_TABLE)
      .upsert({ id: SETTINGS_ID, data: safeSettings });

    if (error) throw error;
  } catch (error) {
    console.error('Erro ao persistir configurações no Supabase:', error);
  }
};
