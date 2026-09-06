import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabaseClient';

export type SummaryStatus = 'MISSING' | 'GENERATING' | 'READY' | 'FAILED';

export interface DeliverySummaryRecord {
  id: string;
  scope: 'today' | 'tomorrow' | 'next_days' | 'next5days';
  data_fingerprint: string;
  text: string | null;
  audio_url: string | null;
  text_status: SummaryStatus;
  audio_status: SummaryStatus;
  generator_version: string;
  tts_version: string;
  generation_started_at: string | null;
  error_message: string | null;
  created_at?: string;
  updated_at?: string;
}

const GENERATING_TIMEOUT_MS = 2 * 60 * 1000; // 2 minutos de lease/timeout

export const getSavedSummaryRecord = async (
  scope: 'today' | 'tomorrow' | 'next_days' | 'next5days',
  fingerprint: string
): Promise<DeliverySummaryRecord | null> => {
  try {
    const { data, error } = await supabase
      .from('delivery_summaries')
      .select('*')
      .eq('scope', scope)
      .eq('data_fingerprint', fingerprint)
      .maybeSingle();

    if (!error && data) {
      return data as DeliverySummaryRecord;
    }
  } catch (err) {
    // Tabela pode ainda não ter sido criada no Supabase — usa AsyncStorage como fallback seguro
  }

  try {
    const raw = await AsyncStorage.getItem(`@morante_delivery_summary_${scope}_${fingerprint}`);
    if (raw) {
      return JSON.parse(raw) as DeliverySummaryRecord;
    }
  } catch {}

  return null;
};

export const saveSummaryRecord = async (
  record: Partial<DeliverySummaryRecord> & { scope: 'today' | 'tomorrow' | 'next_days' | 'next5days'; data_fingerprint: string }
): Promise<DeliverySummaryRecord> => {
  const fullRecord: DeliverySummaryRecord = {
    id: record.id || `sum_${record.scope}_${record.data_fingerprint}`,
    scope: record.scope,
    data_fingerprint: record.data_fingerprint,
    text: record.text || null,
    audio_url: record.audio_url || null,
    text_status: record.text_status || 'MISSING',
    audio_status: record.audio_status || 'MISSING',
    generator_version: record.generator_version || 'v1',
    tts_version: record.tts_version || 'v1',
    generation_started_at: record.generation_started_at || new Date().toISOString(),
    error_message: record.error_message || null,
    created_at: record.created_at || new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  try {
    await supabase.from('delivery_summaries').upsert(fullRecord);
  } catch (err) {
    // Graceful fallback
  }

  try {
    await AsyncStorage.setItem(
      `@morante_delivery_summary_${record.scope}_${record.data_fingerprint}`,
      JSON.stringify(fullRecord)
    );
  } catch {}

  return fullRecord;
};

export const isLeaseExpired = (startedAtIso?: string | null): boolean => {
  if (!startedAtIso) return true;
  const started = new Date(startedAtIso).getTime();
  const now = Date.now();
  return now - started > GENERATING_TIMEOUT_MS;
};
