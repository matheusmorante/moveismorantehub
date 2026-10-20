import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../../../services/supabaseClient';
import { offlineStorageService } from '../../../services/offline/offlineStorageService';
import { offlineSyncManager } from '../../../services/offline/offlineSyncManager';
import { OrderRepository } from '../../../repositories/OrderRepository';
import { fetchCalendarEvents, CalendarEvent } from '../../../services/scheduleEventsService';
import { excludeTestOrders } from '../../../../../shared-utils/testArtifactQueries';

export function useAgendaData() {
  const [orders, setOrders] = useState<any[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const prevSyncAtRef = useRef<string | undefined>();

  const loadOfflineOrdersFallback = useCallback(async () => {
    try {
      const [logisticsCached, repoOrders] = await Promise.all([
        offlineStorageService.getWorkingSet<any[]>('logistics_orders').catch(() => null),
        OrderRepository.list().catch(() => []),
      ]);
      const byId = new Map<string, any>();
      if (Array.isArray(logisticsCached?.data)) {
        for (const o of logisticsCached.data) {
          if (o?.id) byId.set(o.id, o);
        }
      }
      for (const local of repoOrders) {
        if (local?.id) {
          const existing = byId.get(local.id);
          if (!existing || local.isPendingLocal) {
            byId.set(local.id, {
              ...existing,
              id: local.id,
              status: local.status,
              created_at: local.updatedAt,
              customer_name: local.customerName,
              order_data: local.orderData,
            });
          }
        }
      }
      const merged = Array.from(byId.values()).filter((ord) =>
        ['scheduled', 'draft', 'agendado', 'rascunho'].includes(
          String(ord.status || ord.order_data?.status || '').toLowerCase()
        )
      );
      if (merged.length > 0) {
        setOrders(merged);
      }
    } catch {}
  }, []);

  const loadData = useCallback(async () => {
    try {
      const [ordersOutcome, eventsOutcome] = await Promise.allSettled([
        excludeTestOrders(
          supabase
            .from('orders')
            .select(
              'id, status, scheduled_date, scheduled_start_time, scheduled_end_time, delivery_method, customer_name, order_number, order_index, created_at, order_data'
            )
        )
          .or('deleted.is.null,deleted.eq.false')
          .in('status', ['scheduled', 'draft'])
          .order('created_at', { ascending: false }),
        fetchCalendarEvents(),
      ]);

      if (
        ordersOutcome.status === 'fulfilled' &&
        !ordersOutcome.value.error &&
        ordersOutcome.value.data
      ) {
        const reconciledOrders = await OrderRepository.overlayPendingLocalOrders(
          ordersOutcome.value.data
        );
        setOrders(reconciledOrders);
        await offlineStorageService
          .cacheWorkingSet('logistics_orders', reconciledOrders)
          .catch(() => {});
      } else {
        await loadOfflineOrdersFallback();
      }

      if (eventsOutcome.status === 'fulfilled' && eventsOutcome.value) {
        setEvents(eventsOutcome.value);
      }
    } catch (e) {
      console.warn('[useAgendaData] Erro ao carregar dados da agenda:', e);
      await loadOfflineOrdersFallback();
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [loadOfflineOrdersFallback]);

  useEffect(() => {
    void loadData();

    const unsub = offlineSyncManager.subscribe((summary) => {
      if (summary.lastSyncAt && summary.lastSyncAt !== prevSyncAtRef.current) {
        prevSyncAtRef.current = summary.lastSyncAt;
        void loadOfflineOrdersFallback();
        void fetchCalendarEvents().then(setEvents).catch(() => {});
      }
    });
    return () => unsub();
  }, [loadData, loadOfflineOrdersFallback]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    void loadData();
  }, [loadData]);

  return {
    orders,
    events,
    loading,
    refreshing,
    onRefresh,
    reload: loadData,
  };
}
