import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabaseClient';

export interface VoiceConfig {
  provider: string;
  model: string;
  voiceId: string;
  language: string;
  speed: number;
}

export const DEFAULT_VOICE_CONFIG: VoiceConfig = {
  provider: 'gemini',
  model: 'gemini-2.0-flash',
  voiceId: 'Kore',
  language: 'pt-BR',
  speed: 1.0,
};

export interface AudioCacheRecord {
  id?: string;
  cacheKey: string;
  normalizedText: string;
  provider: string;
  model: string;
  voiceId: string;
  language: string;
  speed: number;
  audioUrl: string;
  audioStoragePath?: string | null;
  created_at?: string;
  last_used_at?: string;
}

// Memory Cache para acesso ultrarrápido síncrono
const memoryAudioCache = new Map<string, AudioCacheRecord>();

// Mapa de requisições em andamento por audioCacheKey para deduplicação concorrente
const inFlightAudioRequests = new Map<
  string,
  Promise<{ success: boolean; audioUrl?: string; base64Mp3?: string; isWav?: boolean; error?: string }>
>();

/**
 * Normaliza deterministicamente o texto do resumo para hashing de áudio.
 * - Remove espaços extras nas pontas (trim)
 * - Normaliza múltiplos espaços/quebras de linha para um único espaço
 * - Preserva pontuação que afeta entonação de voz
 */
export function normalizeSummaryText(text: string): string {
  if (!text) return '';
  return text
    .trim()
    .replace(/\s+/g, ' ');
}

/**
 * Gera hash 32-bit determinístico para a chave de cache.
 */
function simpleHash(str: string): string {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 33) ^ str.charCodeAt(i);
  }
  return (hash >>> 0).toString(16);
}

/**
 * Gera a audioCacheKey baseada estritamente no texto normalizado e configs de voz.
 */
export function generateAudioCacheKey(
  text: string,
  config: Partial<VoiceConfig> = {}
): string {
  const normText = normalizeSummaryText(text);
  const cfg: VoiceConfig = { ...DEFAULT_VOICE_CONFIG, ...config };

  const rawKey = `${normText}|${cfg.provider}|${cfg.model}|${cfg.voiceId}|${cfg.language}|${cfg.speed}`;
  return `aud_${simpleHash(rawKey)}_${cfg.voiceId.toLowerCase()}`;
}

/**
 * Busca áudio cacheado por chave (Memória -> AsyncStorage -> Supabase DB).
 */
export async function getCachedAudioRecord(
  cacheKey: string
): Promise<AudioCacheRecord | null> {
  // 1. Memória
  if (memoryAudioCache.has(cacheKey)) {
    return memoryAudioCache.get(cacheKey)!;
  }

  // 2. AsyncStorage (local fallback)
  try {
    const raw = await AsyncStorage.getItem(`@morante_audio_cache_${cacheKey}`);
    if (raw) {
      const record = JSON.parse(raw) as AudioCacheRecord;
      memoryAudioCache.set(cacheKey, record);
      return record;
    }
  } catch {}

  // 3. Supabase DB
  try {
    const { data, error } = await supabase
      .from('delivery_summary_audio_cache')
      .select('*')
      .eq('cache_key', cacheKey)
      .maybeSingle();

    if (!error && data) {
      const record: AudioCacheRecord = {
        id: data.id,
        cacheKey: data.cache_key,
        normalizedText: data.normalized_text,
        provider: data.provider,
        model: data.model,
        voiceId: data.voice_id,
        language: data.language,
        speed: data.speed,
        audioUrl: data.audio_url,
        audioStoragePath: data.audio_storage_path,
        created_at: data.created_at,
        last_used_at: data.last_used_at,
      };

      memoryAudioCache.set(cacheKey, record);
      try {
        await AsyncStorage.setItem(
          `@morante_audio_cache_${cacheKey}`,
          JSON.stringify(record)
        );
      } catch {}

      return record;
    }
  } catch {}

  return null;
}

/** A URL assinada é descartável; o caminho no Storage é a referência persistente. */
export async function getPlayableAudioUrl(record: AudioCacheRecord): Promise<string | null> {
  if (record.audioStoragePath) {
    const { data, error } = await supabase.storage
      .from('delivery-summary-audio')
      .createSignedUrl(record.audioStoragePath, 60 * 60);
    if (!error && data?.signedUrl) return data.signedUrl;
    return null;
  }
  return record.audioUrl || null;
}

/**
 * Salva novo registro de áudio no cache (Memória + AsyncStorage + Supabase DB).
 */
export async function saveAudioRecordToCache(
  record: AudioCacheRecord
): Promise<AudioCacheRecord> {
  memoryAudioCache.set(record.cacheKey, record);

  try {
    await AsyncStorage.setItem(
      `@morante_audio_cache_${record.cacheKey}`,
      JSON.stringify(record)
    );
  } catch {}

  try {
    await supabase.from('delivery_summary_audio_cache').upsert(
      {
        cache_key: record.cacheKey,
        normalized_text: record.normalizedText,
        provider: record.provider,
        model: record.model,
        voice_id: record.voiceId,
        language: record.language,
        speed: record.speed,
        audio_url: record.audioUrl,
        audio_storage_path: record.audioStoragePath || null,
        last_used_at: new Date().toISOString(),
      },
      { onConflict: 'cache_key' }
    );
  } catch (err) {
    console.warn('[AudioCache] Erro ao salvar no Supabase (usando local cache):', err);
  }

  return record;
}

/**
 * Executa deduplicação de requisições concorrentes em andamento (In-Flight Request Deduplication).
 * Evita múltiplas chamadas TTS ao mesmo tempo para a mesma chave de áudio.
 */
export async function getOrCreateAudioWithDeduplication<T>(
  cacheKey: string,
  generatorFn: () => Promise<T>
): Promise<T> {
  if (inFlightAudioRequests.has(cacheKey)) {
    return (inFlightAudioRequests.get(cacheKey) as unknown) as Promise<T>;
  }

  const promise = generatorFn().finally(() => {
    inFlightAudioRequests.delete(cacheKey);
  });

  inFlightAudioRequests.set(cacheKey, (promise as unknown) as Promise<any>);
  return promise;
}

/**
 * Limpa caches em memória (usado para testes ou reset).
 */
export function clearAudioMemoryCache() {
  memoryAudioCache.clear();
  inFlightAudioRequests.clear();
}
