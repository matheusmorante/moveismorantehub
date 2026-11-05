import { useCallback, useEffect, useState } from 'react';
import { fetchCalendarEvents, type CalendarEvent } from '../../../services/scheduleEventsService';
import { useScopedOrderSchedule } from '../../logistics/hooks/useScopedOrderSchedule';

export function useAgendaData(kind = 'all') {
  const schedule = useScopedOrderSchedule('agenda', { kind });
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const loadEvents = useCallback(async () => {
    if (!['all', 'events'].includes(kind)) return [];
    return fetchCalendarEvents();
  }, [kind]);
  useEffect(() => {
    let active = true;
    void loadEvents().then((rows) => { if (active) setEvents(rows); }).catch(() => {});
    return () => { active = false; };
  }, [loadEvents]);
  const reload = useCallback(async () => {
    const [eventResult] = await Promise.allSettled([loadEvents(), schedule.reload()]);
    if (eventResult.status === 'fulfilled') setEvents(eventResult.value);
  }, [loadEvents, schedule.reload]);
  return { ...schedule, events, reload, onRefresh: () => { schedule.onRefresh(); void loadEvents().then(setEvents).catch(() => {}); } };
}
