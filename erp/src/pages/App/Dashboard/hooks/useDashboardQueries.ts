import { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/pages/utils/supabaseConfig';
import type Order from '../../../types/order.type';
import type { GeoMapOrderProjection, RecentOrderProjection } from '../../../types/dashboardOrderProjection.type';
import {
  fetchAllOrdersForDashboard,
  fetchGeoMapOrders,
  fetchRecentOrders,
  fetchScheduledAndDraftOrders,
} from '../../../utils/orderHistoryService';
import { isHmlFiscalTestOrder } from '../../../utils/hmlTestData';
import { parseDashboardSalesRollup } from '../dashboardSalesRollup';

const EMPTY_ORDERS: Order[] = [];
const EMPTY_RECENT: RecentOrderProjection[] = [];
const EMPTY_GEO: GeoMapOrderProjection[] = [];
const REALTIME_READY_TIMEOUT_MS = 1_000;

/** Consultas independentes permitem trocar o período sem recarregar os outros painéis. */
export function useDashboardQueries(start: Date, end: Date, currentStart?: Date, previousEnd?: Date) {
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();
  const userId = user?.id ?? '';
  const roleScope = [profile?.role ?? '', ...(profile?.roles ?? [])].sort().join(',');
  const scopeKey = useMemo(() => ['dashboard-orders', userId, roleScope] as const, [userId, roleScope]);
  const identityReady = Boolean(userId && profile?.id === userId);
  const scopeId = `${userId}:${roleScope}`;
  const [realtimeGate, setRealtimeGate] = useState<{ scopeId: string; ready: boolean }>({ scopeId: '', ready: false });
  const realtimeReady = realtimeGate.scopeId === scopeId && realtimeGate.ready;
  const enabled = identityReady && realtimeReady;
  const startIso = start.toISOString();
  const endIso = end.toISOString();
  const currentStartIso = currentStart?.toISOString();
  const previousEndIso = previousEnd?.toISOString();
  const options = {
    enabled,
    staleTime: Infinity,
    refetchOnWindowFocus: 'always' as const,
    refetchOnReconnect: 'always' as const,
  };

  const period = useQuery({
    ...options,
    queryKey: [...scopeKey, 'period', startIso, endIso],
    queryFn: () => fetchAllOrdersForDashboard({ start: new Date(startIso), end: new Date(endIso) }, { throwOnError: true }),
  });
  const scheduled = useQuery({
    ...options,
    queryKey: [...scopeKey, 'scheduled'],
    queryFn: () => fetchScheduledAndDraftOrders({ throwOnError: true }),
  });
  const recent = useQuery({
    ...options,
    queryKey: [...scopeKey, 'recent'],
    queryFn: () => fetchRecentOrders(5, { throwOnError: true }),
  });
  const geo = useQuery({
    ...options,
    queryKey: [...scopeKey, 'geo'],
    queryFn: () => fetchGeoMapOrders(50, { throwOnError: true }),
  });
  const salesRollup = useQuery({
    ...options,
    enabled: enabled && Boolean(currentStartIso && previousEndIso),
    retry: false,
    queryKey: [...scopeKey, 'sales-rollup', startIso, endIso, currentStartIso, previousEndIso],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_dashboard_sales_summary', {
        p_current_start: currentStartIso, p_current_end: endIso,
        p_previous_start: startIso, p_previous_end: previousEndIso,
      });
      if (error) return null;
      return parseDashboardSalesRollup(data);
    },
  });

  useEffect(() => {
    if (!identityReady) {
      setRealtimeGate({ scopeId: '', ready: false });
      return;
    }

    setRealtimeGate({ scopeId, ready: false });

    // Ao voltar à tela, revalida o que pode ter mudado enquanto não havia assinatura.
    if (queryClient.getQueriesData({ queryKey: scopeKey }).some(([, data]) => data !== undefined)) {
      void queryClient.invalidateQueries({ queryKey: scopeKey });
    }

    let timer: ReturnType<typeof setTimeout> | undefined;
    let readyFallbackUsed = false;
    let hasSubscribed = false;
    const invalidate = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        void queryClient.cancelQueries({ queryKey: scopeKey }).then(() =>
          queryClient.invalidateQueries({ queryKey: scopeKey })
        );
      }, 150);
    };
    const changesChannel = supabase.channel('dashboard-orders-and-items')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, invalidate)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'order_items' }, invalidate)
      .subscribe((status) => {
        if (status !== 'SUBSCRIBED') return;
        if (hasSubscribed) {
          // Mudanças durante uma desconexão são recuperadas ao restabelecer o canal.
          invalidate();
          return;
        }

        hasSubscribed = true;
        setRealtimeGate({ scopeId, ready: true });
        // Se o failsafe já liberou a leitura, fecha a janela sem assinatura.
        if (readyFallbackUsed) invalidate();
      });
    const readyFallback = setTimeout(() => {
      readyFallbackUsed = true;
      setRealtimeGate({ scopeId, ready: true });
    }, REALTIME_READY_TIMEOUT_MS);
    return () => {
      if (timer) clearTimeout(timer);
      clearTimeout(readyFallback);
      void supabase.removeChannel(changesChannel);
    };
  }, [identityReady, queryClient, scopeId, scopeKey]);

  const periodOrders = period.data ?? EMPTY_ORDERS;
  const scheduledOrders = scheduled.data ?? EMPTY_ORDERS;
  const orders = useMemo(() => {
    const orderMap = new Map<string, Order>();
    for (const order of periodOrders) {
      if (order?.id && !isHmlFiscalTestOrder(order)) orderMap.set(String(order.id), order);
    }
    for (const order of scheduledOrders) {
      if (order?.id && !isHmlFiscalTestOrder(order) && !orderMap.has(String(order.id))) {
        orderMap.set(String(order.id), order);
      }
    }
    return Array.from(orderMap.values());
  }, [periodOrders, scheduledOrders]);

  return {
    orders,
    recentOrders: recent.data ?? EMPTY_RECENT,
    geoMapOrders: geo.data ?? EMPTY_GEO,
    salesRollup: salesRollup.data ?? null,
    salesSummaryLoading: salesRollup.isLoading,
    ordersQueryError: [period, scheduled, recent, geo].some((query) => query.isError),
    retryOrderQueries: () => Promise.all([
      period.refetch(), scheduled.refetch(), recent.refetch(), geo.refetch(),
    ]),
    loading: (identityReady && !realtimeReady) || [period, scheduled, recent, geo].some((query) => query.isLoading),
  };
}
