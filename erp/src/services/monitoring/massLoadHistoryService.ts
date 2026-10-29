import { supabase } from '@/pages/utils/supabaseConfig';
import { withTimeout } from '../../../../shared-utils/withTimeout';
import type { AggregatedMetric } from './types';

const TABLE_NAME = 'supabase_mass_load_history';
const LEGACY_OUTBOX_KEY = 'supabase_mass_load_history_outbox_v1';
const LEGACY_MIGRATED_PREFIX = 'supabase_anomaly_legacy_migrated_v2:';
const OUTBOX_PREFIX = 'supabase_anomaly_outbox_v2:';
const REQUEST_TIMEOUT_MS = 10000;
const MAX_RETRY_MS = 60000;
const memoryOutbox = new Map<string, PendingRecord>();
let activeUserId: string | null = null;
let retryTimer: ReturnType<typeof setTimeout> | null = null;
let retryAttempt = 0;
let flushing: Promise<void> | null = null;

export interface MassLoadHistoryRecord {
  id: string;
  user_id: string | null;
  occurred_at: string;
  title: string;
  message: string;
  level?: string;
  metric: AggregatedMetric | null;
  pending?: boolean;
}

type PendingRecord = MassLoadHistoryRecord & { user_id: string };
type HistoryCursor = Pick<MassLoadHistoryRecord, 'id' | 'occurred_at'>;
type DatabaseResult = { error: { code?: string; message?: string } | null };

const isPendingRecord = (value: unknown): value is PendingRecord => {
  if (!value || typeof value !== 'object') return false;
  const record = value as Partial<PendingRecord>;
  return typeof record.id === 'string' && typeof record.user_id === 'string' &&
    typeof record.occurred_at === 'string' && typeof record.title === 'string' &&
    typeof record.message === 'string';
};

const notifyChange = (synced = false) =>
  window.dispatchEvent(new CustomEvent('SUPABASE_ANOMALY_HISTORY_CHANGED', { detail: { synced } }));

const readOutbox = (): PendingRecord[] => {
  const records = new Map(memoryOutbox);
  try {
    // Copy old entries once. Keep the legacy array for older tabs still using it.
    const legacy = localStorage.getItem(LEGACY_OUTBOX_KEY);
    if (legacy) {
      try {
        const parsed: unknown = JSON.parse(legacy);
        if (Array.isArray(parsed)) {
          for (const item of parsed) {
            if (isPendingRecord(item) && !localStorage.getItem(LEGACY_MIGRATED_PREFIX + item.id)) {
              localStorage.setItem(OUTBOX_PREFIX + item.id, JSON.stringify(item));
              localStorage.setItem(LEGACY_MIGRATED_PREFIX + item.id, '1');
            }
          }
        }
      } catch { /* Preserve an unreadable old queue without hiding newer entries. */ }
    }
    for (let index = 0; index < localStorage.length; index++) {
      const key = localStorage.key(index);
      if (!key?.startsWith(OUTBOX_PREFIX)) continue;
      try {
        const item: unknown = JSON.parse(localStorage.getItem(key) || 'null');
        if (isPendingRecord(item)) records.set(item.id, item);
      } catch {
        // Keep malformed entries untouched; do not discard other records.
      }
    }
  } catch {
    // The in-memory queue can still retry while this page remains open.
  }
  return Array.from(records.values());
};

const storePending = (record: PendingRecord) => {
  try {
    localStorage.setItem(OUTBOX_PREFIX + record.id, JSON.stringify(record));
  } catch {
    memoryOutbox.set(record.id, record);
    window.dispatchEvent(new Event('SUPABASE_ANOMALY_HISTORY_STORAGE_ERROR'));
  }
  notifyChange();
};

const removePending = (id: string) => {
  memoryOutbox.delete(id);
  try { localStorage.removeItem(OUTBOX_PREFIX + id); } catch { /* retry after storage recovers */ }
  notifyChange(true);
};

export const getPendingMassLoadHistory = (userId: string) =>
  readOutbox()
    .filter((record) => record.user_id === userId)
    .sort((a, b) => Date.parse(b.occurred_at) - Date.parse(a.occurred_at))
    .map((record) => ({ ...record, pending: true }));

const scheduleRetry = (userId: string) => {
  if (activeUserId !== userId || retryTimer) return;
  const delay = Math.min(1000 * 2 ** Math.min(retryAttempt++, 6), MAX_RETRY_MS);
  retryTimer = setTimeout(() => {
    retryTimer = null;
    void flushPendingMassLoadHistory(userId);
  }, delay);
};

const insertRecord = async (record: PendingRecord) => {
  const controller = new AbortController();
  try {
    const query = supabase.from(TABLE_NAME).insert(record).abortSignal(controller.signal);
    const result = await withTimeout<DatabaseResult | null>(query, REQUEST_TIMEOUT_MS, null, 'histórico de alertas');
    if (!result) throw new Error('Tempo de envio do histórico esgotado.');
    if (result.error && result.error.code !== '23505') throw result.error;
  } finally {
    controller.abort();
  }
};

export const flushPendingMassLoadHistory = (userId: string): Promise<void> => {
  if (!userId) return Promise.resolve();
  if (flushing) return flushing;
  flushing = (async () => {
    const attempted = new Set<string>();
    let failed = false;
    try {
      while (activeUserId === userId) {
        const record = readOutbox().find((item) => item.user_id === userId && !attempted.has(item.id));
        if (!record) {
          if (failed) scheduleRetry(userId);
          else retryAttempt = 0;
          return;
        }
        attempted.add(record.id);
        try {
          await insertRecord(record);
          removePending(record.id);
        } catch (error) {
          failed = true;
          console.error('[SupabaseMonitor] Falha ao sincronizar um alerta:', error);
        }
      }
    } catch (error) {
      console.error('[SupabaseMonitor] Falha ao sincronizar o histórico de alertas:', error);
      scheduleRetry(userId);
    }
  })().finally(() => {
    flushing = null;
    if (activeUserId && activeUserId !== userId) void flushPendingMassLoadHistory(activeUserId);
    else if (activeUserId && readOutbox().some((item) => item.user_id === activeUserId)) scheduleRetry(activeUserId);
  });
  return flushing;
};

export const startMassLoadHistorySync = (userId: string) => {
  activeUserId = userId;
  retryAttempt = 0;
  const retry = () => {
    if (retryTimer) clearTimeout(retryTimer);
    retryTimer = null;
    void flushPendingMassLoadHistory(userId);
  };
  window.addEventListener('online', retry);
  retry();
  return () => {
    window.removeEventListener('online', retry);
    if (activeUserId === userId) {
      activeUserId = null;
      if (retryTimer) clearTimeout(retryTimer);
      retryTimer = null;
    }
  };
};

export const recordSupabaseAnomaly = (
  event: { title: string; message: string; metric?: AggregatedMetric; level?: string },
  userId?: string | null
) => {
  if (!userId) return;
  const record: PendingRecord = {
    id: crypto.randomUUID(),
    user_id: userId,
    occurred_at: new Date().toISOString(),
    title: event.title,
    message: event.message,
    level: event.level === 'CRITICAL' ? 'CRITICAL' : event.level === 'INFO' ? 'INFO' : 'WARNING',
    metric: event.metric ?? null,
  };
  storePending(record);
  void flushPendingMassLoadHistory(userId);
};

export const fetchMassLoadHistoryPage = async (cursor: HistoryCursor | null, limit: number) => {
  const controller = new AbortController();
  try {
    let query = supabase.from(TABLE_NAME)
      .select('id, user_id, occurred_at, title, message, level, metric')
      .order('occurred_at', { ascending: false })
      .order('id', { ascending: false })
      .limit(limit);
    if (cursor) {
      query = query.or('occurred_at.lt.' + cursor.occurred_at + ',and(occurred_at.eq.' + cursor.occurred_at + ',id.lt.' + cursor.id + ')');
    }
    const result = await withTimeout<{ data: MassLoadHistoryRecord[] | null; error: { message?: string } | null } | null>(
      query.abortSignal(controller.signal), REQUEST_TIMEOUT_MS, null, 'consulta do histórico de alertas'
    );
    if (!result) throw new Error('Tempo de consulta do histórico esgotado.');
    if (result.error) throw result.error;
    return result.data ?? [];
  } finally {
    controller.abort();
  }
};
