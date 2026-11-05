import { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/pages/utils/supabaseConfig';
import type { GeoMapOrderProjection, RecentOrderProjection } from '../../../types/dashboardOrderProjection.type';
import {
  fetchGeoMapOrders,
  fetchRecentOrders,
} from '../../../utils/orderHistoryService';
import { fetchDashboardMetrics, type DashboardMetricsRange } from '../dashboardMetrics';

const EMPTY_RECENT: RecentOrderProjection[] = [];
const EMPTY_GEO: GeoMapOrderProjection[] = [];
const REALTIME_READY_TIMEOUT_MS = 1_000;

/** Consultas independentes permitem trocar o período sem recarregar os outros painéis. */
export function useDashboardQueries(range: DashboardMetricsRange) {
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();
  const userId = user?.id ?? '';
  const roleScope = [profile?.role ?? '', ...(profile?.roles ?? [])].sort().join(',');
  const scopeKey = useMemo(() => ['dashboard-metrics', userId, roleScope] as const, [userId, roleScope]);
  const identityReady = Boolean(userId && profile?.id === userId);
  const scopeId = `${userId}:${roleScope}`;
  const [realtimeGate, setRealtimeGate] = useState<{ scopeId: string; ready: boolean }>({ scopeId: '', ready: false });
  const realtimeReady = realtimeGate.scopeId === scopeId && realtimeGate.ready;
  const enabled = identityReady && realtimeReady;
  const options = {
    enabled,
    staleTime: 60_000,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    retry: false,
  };

  const metrics = useQuery({
    ...options,
    queryKey: [...scopeKey, 'period', range.previousStart.toISOString(), range.previousEnd.toISOString(),
      range.currentStart.toISOString(), range.currentEnd.toISOString(), range.bucket, range.timezone],
    queryFn: ({ signal }) => fetchDashboardMetrics(range, signal),
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

  return {
    metrics: metrics.data,
    recentOrders: recent.data ?? EMPTY_RECENT,
    geoMapOrders: geo.data ?? EMPTY_GEO,
    ordersQueryError: [metrics, recent, geo].some((query) => query.isError),
    retryOrderQueries: () => Promise.all([
      metrics.refetch(), recent.refetch(), geo.refetch(),
    ]),
    loading: (identityReady && !realtimeReady) || [metrics, recent, geo].some((query) => query.isLoading),
  };
}
