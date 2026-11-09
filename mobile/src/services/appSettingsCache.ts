import { supabase } from './supabaseClient';

let cachedAppSettings: any | null = null;
let appSettingsPromise: PromiseLike<any | null> | null = null;
let cacheGeneration = 0;
const freshMetaDescriptionsBySession = new Map<string, Promise<string | null>>();
const FRESH_SETTINGS_REQUEST_DEDUPE_MS = 15_000;

/** Lê a descrição do WhatsApp atual e compartilha só a leitura pendente da sessão. */
export const getFreshWhatsAppBaseDescriptionForSession = (sessionKey: string): Promise<string | null> => {
  const pending = freshMetaDescriptionsBySession.get(sessionKey);
  if (pending) return pending;

  const request = Promise.resolve(
    supabase
      .from('settings')
      .select('whatsapp_description:data->channelBaseDescriptions->>whatsapp')
      .eq('id', 'app')
      .maybeSingle()
  ).then(({ data, error }) => {
    if (error) throw error;
    const result = data as { whatsapp_description?: unknown } | null;
    return typeof result?.whatsapp_description === 'string'
      ? result.whatsapp_description
      : null;
  });
  freshMetaDescriptionsBySession.set(sessionKey, request);

  const clearPending = () => {
    if (freshMetaDescriptionsBySession.get(sessionKey) === request) {
      freshMetaDescriptionsBySession.delete(sessionKey);
    }
  };
  const expiry = setTimeout(clearPending, FRESH_SETTINGS_REQUEST_DEDUPE_MS);
  void request.then(
    () => {
      clearTimeout(expiry);
      clearPending();
    },
    () => {
      clearTimeout(expiry);
      clearPending();
    }
  );

  return request;
};

/** Carrega somente o payload de configurações e reutiliza-o durante a sessão. */
export const getAppSettings = async (
  options: { forceRefresh?: boolean } = {}
): Promise<any | null> => {
  if (options.forceRefresh) {
    cacheGeneration += 1;
    cachedAppSettings = null;
    appSettingsPromise = null;
  }

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
      }
    );
  appSettingsPromise = request;

  return appSettingsPromise;
};

export const clearAppSettingsCache = () => {
  cacheGeneration += 1;
  cachedAppSettings = null;
  appSettingsPromise = null;
};
