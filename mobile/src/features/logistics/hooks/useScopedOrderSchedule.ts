import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../../../services/supabaseClient';
import { offlineStorageService } from '../../../services/offline/offlineStorageService';
import { offlineSyncManager } from '../../../services/offline/offlineSyncManager';
import { connectivityService } from '../../../services/offline/connectivityService';
import { OrderRepository } from '../../../repositories/OrderRepository';
import { subscribeToLogisticsChanges } from '../../../services/logisticsRealtimeService';
import { fetchOrderScheduleRows, type OrderScheduleScope } from '../../../../../shared-utils/orderScheduleServerQuery';
import { ORDER_SUMMARY_COLUMNS } from '../../../../../shared-utils/orderSummaryQuery';
import { refreshOfflineOrderSnapshots } from '../../../services/offline/orderSnapshotCache';

/** Online consulta somente o escopo; offline preserva os pedidos já salvos. */
export function useScopedOrderSchedule(scope: OrderScheduleScope, filters: Record<string, unknown>, cacheKey = 'logistics_orders', enabled = true) {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showingOffline, setShowingOffline] = useState(!connectivityService.connected);
  const [error, setError] = useState('');
  const [counts, setCounts] = useState<Record<string, number>>({});
  const sequence = useRef(0);
  const controller = useRef<AbortController | null>(null);
  const filtersKey = JSON.stringify(filters);

  const reload = useCallback(async () => {
    if (!enabled) return;
    const current = ++sequence.current;
    controller.current?.abort();
    const request = new AbortController(); controller.current = request;
    setLoading(true); setError('');
    try {
      if (!connectivityService.connected) {
        const [cached, logistics, summaries, locals] = await Promise.all([
          offlineStorageService.getWorkingSet<any[]>(cacheKey).catch(() => null),
          offlineStorageService.getWorkingSet<any[]>('logistics_orders').catch(() => null),
          offlineStorageService.getWorkingSet<any[]>(`${cacheKey}:summaries`).catch(() => null),
          OrderRepository.list().catch(() => []),
        ]);
        if (current !== sequence.current) return;
        const byId = new Map<string, any>();
        for (const row of [...(summaries?.data || []), ...(logistics?.data || []), ...(cached?.data || [])]) if (row?.id) byId.set(row.id, row);
        for (const local of locals) if (local.id && (!byId.has(local.id) || local.isPendingLocal)) byId.set(local.id, {
          ...byId.get(local.id), id: local.id, status: local.status, order_type: local.orderType,
          created_at: local.updatedAt, customer_name: local.customerName, order_data: local.orderData,
        });
        setOrders([...byId.values()]); setShowingOffline(true);
        return;
      }
      setShowingOffline(false);
      const rows = await fetchOrderScheduleRows(supabase, scope, JSON.parse(filtersKey), ORDER_SUMMARY_COLUMNS, request.signal,
        (summary) => { if (current === sequence.current && !request.signal.aborted) setCounts(summary); });
      rows.forEach((row: any) => { row.order_data = { ...row.order_data, items: row.items || [] }; });
      const reconciled = await OrderRepository.overlayPendingLocalOrders(rows);
      if (current !== sequence.current || request.signal.aborted) return;
      setOrders(reconciled);
      await refreshOfflineOrderSnapshots(rows, request.signal).catch((cause) => console.warn('[Agenda] Detalhes offline não atualizados:', cause));
      const cached = await offlineStorageService.getWorkingSet<any[]>(`${cacheKey}:summaries`).catch(() => null);
      const byId = new Map((cached?.data || []).map((row: any) => [row.id, row]));
      reconciled.forEach((row: any) => byId.set(row.id, row));
      await offlineStorageService.cacheWorkingSet(`${cacheKey}:summaries`, [...byId.values()]).catch(() => {});
    } catch (failure) {
      if (current === sequence.current && !request.signal.aborted) {
        console.warn('[Agenda] Não foi possível consultar os pedidos:', failure);
        setOrders([]); setCounts({}); setError('Não foi possível carregar os pedidos. Tente atualizar.');
      }
    } finally {
      if (current === sequence.current) { setLoading(false); setRefreshing(false); }
    }
  }, [cacheKey, enabled, filtersKey, scope]);

  useEffect(() => {
    if (!enabled) { setOrders([]); setCounts({}); setLoading(false); setRefreshing(false); return; }
    void reload();
    const stopRealtime = subscribeToLogisticsChanges(() => void reload());
    let wasConnected = connectivityService.connected;
    const stopConnection = connectivityService.subscribe((connected) => {
      if (connected !== wasConnected) { wasConnected = connected; void reload(); }
    });
    let lastSync: string | undefined;
    const stopSync = offlineSyncManager.subscribe((summary) => {
      if (summary.lastSyncAt && summary.lastSyncAt !== lastSync) { lastSync = summary.lastSyncAt; void reload(); }
    });
    return () => { sequence.current += 1; controller.current?.abort(); stopRealtime(); stopConnection(); stopSync(); };
  }, [enabled, reload]);
  const onRefresh = useCallback(() => { setRefreshing(true); void reload(); }, [reload]);
  return { orders, counts, loading, refreshing, showingOffline, error, onRefresh, reload };
}
