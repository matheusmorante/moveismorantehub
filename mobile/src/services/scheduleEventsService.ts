import { supabase } from './supabaseClient';
import { offlineStorageService, generateUUID } from './offline/offlineStorageService';
import { connectivityService } from './offline/connectivityService';

export interface CalendarEvent {
  id: string;
  title: string;
  date?: string;
  event_date?: string;
  time_or_period?: string; // Ex: '14:00' ou 'Manhã', 'Tarde', 'Integral'
  start_time?: string;
  end_time?: string;
  description?: string | null;
  type?: 'REUNION' | 'INSPECTION' | 'MAINTENANCE' | 'TRAINING' | 'OTHER';
  type_label?: string;
  notes?: string | null;
  created_by?: string | null;
  created_at: string;
}

const LOCAL_EVENTS_CACHE_KEY = 'schedule_calendar_events_v1';
const PENDING_LOCAL_EVENTS_KEY = 'schedule_calendar_events_pending_v1';

const resolveSessionUserId = async (explicitUserId?: string | null): Promise<string | null> => {
  if (explicitUserId) return explicitUserId;
  try {
    const auth = (supabase as any)?.auth;
    if (typeof auth?.getSession === 'function') {
      const { data } = await auth.getSession();
      return data?.session?.user?.id || null;
    }
  } catch {}
  return null;
};

const mergeEventsById = (
  primary: CalendarEvent[],
  secondary: CalendarEvent[]
): CalendarEvent[] => {
  const byId = new Map<string, CalendarEvent>();
  for (const evt of primary) {
    if (evt?.id) byId.set(evt.id, evt);
  }
  for (const evt of secondary) {
    if (evt?.id && !byId.has(evt.id)) {
      byId.set(evt.id, evt);
    }
  }
  return Array.from(byId.values()).sort((a, b) =>
    String(a.date || a.event_date || '').localeCompare(String(b.date || b.event_date || ''))
  );
};

export const getPendingLocalCalendarEvents = async (): Promise<CalendarEvent[]> => {
  try {
    const cached =
      await offlineStorageService.getWorkingSet<CalendarEvent[]>(PENDING_LOCAL_EVENTS_KEY);
    return Array.isArray(cached?.data) ? cached.data : [];
  } catch {
    return [];
  }
};

export const syncPendingLocalCalendarEvents = async (
  activeUserId?: string | null
): Promise<number> => {
  if (!connectivityService.connected) return 0;
  const pending = await getPendingLocalCalendarEvents();
  if (pending.length === 0) return 0;

  const currentUserId = await resolveSessionUserId(activeUserId);
  const remaining: CalendarEvent[] = [];
  let syncedCount = 0;

  for (const evt of pending) {
    if (!connectivityService.connected) {
      remaining.push(evt);
      continue;
    }
    // Isolamento multi-usuário: impede enviar evento criado por outro operador no mesmo aparelho
    if (evt.created_by && currentUserId && evt.created_by !== currentUserId) {
      remaining.push(evt);
      continue;
    }
    try {
      const tableRef = supabase.from('calendar_events') as any;
      const response =
        typeof tableRef.upsert === 'function'
          ? await tableRef.upsert([evt], { onConflict: 'id' })
          : await tableRef.insert([evt]);
      const error = response?.error;

      if (!error || error.code === '23505') {
        syncedCount++;
      } else if (error.code === '42P01' || error.code === 'PGRST205') {
        // Tabela não existe no servidor; mantém apenas no cache local sem bloquear fila
        syncedCount++;
      } else {
        remaining.push(evt);
      }
    } catch {
      remaining.push(evt);
    }
  }

  await offlineStorageService.cacheWorkingSet(PENDING_LOCAL_EVENTS_KEY, remaining);
  return syncedCount;
};

export const fetchCalendarEvents = async (
  activeUserId?: string | null
): Promise<CalendarEvent[]> => {
  const pendingBeforeSync = await getPendingLocalCalendarEvents();

  if (connectivityService.connected && pendingBeforeSync.length > 0) {
    await syncPendingLocalCalendarEvents(activeUserId).catch(() => 0);
  }

  const remainingPending = await getPendingLocalCalendarEvents();

  try {
    // 1. Tentar ler do Supabase se existir a tabela calendar_events
    const { data, error } = await supabase
      .from('calendar_events')
      .select('*')
      .order('date', { ascending: true });

    if (!error && data) {
      // Alterações locais pendentes têm precedência sobre leitura remota para evitar perda de dados
      const merged = mergeEventsById(remainingPending, data as CalendarEvent[]);
      await offlineStorageService.cacheWorkingSet(LOCAL_EVENTS_CACHE_KEY, merged);
      return merged;
    }
  } catch {}

  // 2. Fallback para cache offline local + pendentes (com precedência para pendentes)
  try {
    const cached =
      await offlineStorageService.getWorkingSet<CalendarEvent[]>(LOCAL_EVENTS_CACHE_KEY);
    const localList = Array.isArray(cached?.data) ? cached.data : [];
    return mergeEventsById(remainingPending, localList);
  } catch {}

  return remainingPending;
};

export const createCalendarEvent = async (
  eventPayload: Omit<CalendarEvent, 'id' | 'created_at'> & { id?: string }
): Promise<{ success: boolean; data?: CalendarEvent; error?: string }> => {
  const currentUserId = await resolveSessionUserId(eventPayload.created_by);
  const newEvent: CalendarEvent = {
    ...eventPayload,
    id: eventPayload.id || generateUUID(),
    created_by: eventPayload.created_by ?? currentUserId ?? null,
    created_at: new Date().toISOString(),
  };

  let persistedRemotely = false;
  if (connectivityService.connected) {
    try {
      const tableRef = supabase.from('calendar_events') as any;
      const response =
        typeof tableRef.upsert === 'function'
          ? await tableRef.upsert([newEvent], { onConflict: 'id' })
          : await tableRef.insert([newEvent]);
      const error = response?.error;

      if (!error || error.code === '23505') {
        persistedRemotely = true;
      } else {
        console.warn(
          '[ScheduleEvents] Falha ao inserir em calendar_events no Supabase, salvando localmente:',
          error.message
        );
      }
    } catch {}
  }

  // Se não persistiu remotamente, adiciona à fila de eventos pendentes de sincronização
  if (!persistedRemotely) {
    try {
      const pending = await getPendingLocalCalendarEvents();
      await offlineStorageService.cacheWorkingSet(
        PENDING_LOCAL_EVENTS_KEY,
        mergeEventsById([newEvent], pending)
      );
    } catch {}
  }

  // Atualizar cache local imediatamente sem depender de rede
  try {
    const cached =
      await offlineStorageService.getWorkingSet<CalendarEvent[]>(LOCAL_EVENTS_CACHE_KEY);
    const existing = Array.isArray(cached?.data) ? cached.data : [];
    const updated = mergeEventsById([newEvent], existing);
    await offlineStorageService.cacheWorkingSet(LOCAL_EVENTS_CACHE_KEY, updated);
  } catch {}

  return { success: true, data: newEvent };
};
