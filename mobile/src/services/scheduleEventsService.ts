import { supabase } from './supabaseClient';
import { offlineStorageService } from './offline/offlineStorageService';

export interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  time_or_period: string; // Ex: '14:00' ou 'Manhã', 'Tarde', 'Integral'
  type: 'REUNION' | 'INSPECTION' | 'MAINTENANCE' | 'TRAINING' | 'OTHER';
  type_label?: string;
  notes?: string | null;
  created_by?: string | null;
  created_at: string;
}

const LOCAL_EVENTS_CACHE_KEY = 'schedule_calendar_events_v1';

export const fetchCalendarEvents = async (): Promise<CalendarEvent[]> => {
  try {
    // 1. Tentar ler do Supabase se existir a tabela calendar_events ou settings
    const { data, error } = await supabase
      .from('calendar_events')
      .select('*')
      .order('date', { ascending: true });

    if (!error && data) {
      await offlineStorageService.cacheWorkingSet(LOCAL_EVENTS_CACHE_KEY, data);
      return data;
    }
  } catch {}

  // 2. Fallback para cache offline local
  try {
    const cached = await offlineStorageService.getWorkingSet<CalendarEvent[]>(LOCAL_EVENTS_CACHE_KEY);
    if (cached?.data) {
      return cached.data;
    }
  } catch {}

  return [];
};

export const createCalendarEvent = async (eventPayload: Omit<CalendarEvent, 'id' | 'created_at'>): Promise<{ success: boolean; data?: CalendarEvent; error?: string }> => {
  const newEvent: CalendarEvent = {
    ...eventPayload,
    id: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
    created_at: new Date().toISOString(),
  };

  try {
    // Tentar persistir no Supabase
    const { error } = await supabase.from('calendar_events').insert([newEvent]);
    if (error) {
      console.warn('[ScheduleEvents] Tabela calendar_events não encontrada no Supabase, salvando localmente:', error.message);
    }
  } catch {}

  // Atualizar cache local
  try {
    const existing = await fetchCalendarEvents();
    const updated = [...existing, newEvent];
    await offlineStorageService.cacheWorkingSet(LOCAL_EVENTS_CACHE_KEY, updated);
  } catch {}

  return { success: true, data: newEvent };
};
