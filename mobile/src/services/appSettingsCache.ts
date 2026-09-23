import { supabase } from './supabaseClient';

let cachedAppSettings: any | null = null;
let appSettingsPromise: PromiseLike<any | null> | null = null;
let cacheGeneration = 0;

/** Carrega somente o payload de configurações e reutiliza-o durante a sessão. */
export const getAppSettings = async (): Promise<any | null> => {
  if (cachedAppSettings) return cachedAppSettings;
  if (appSettingsPromise) return appSettingsPromise;

  const generation = cacheGeneration;
  const request = supabase
    .from('settings')
    .select('data')
    .eq('id', 'app')
    .maybeSingle()
    .then(({ data, error }) => {
      if (error) throw error;
      const settings = data?.data ?? null;
      if (generation === cacheGeneration) cachedAppSettings = settings;
      return settings;
    })
    .then(
      (value) => {
        if (generation === cacheGeneration) appSettingsPromise = null;
        return value;
      },
      (error) => {
        if (generation === cacheGeneration) appSettingsPromise = null;
        throw error;
      },
    );
  appSettingsPromise = request;

  return appSettingsPromise;
};

export const clearAppSettingsCache = () => {
  cacheGeneration += 1;
  cachedAppSettings = null;
  appSettingsPromise = null;
};
