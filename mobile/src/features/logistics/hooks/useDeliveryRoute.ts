import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { supabase } from '../../../services/supabaseClient';
import { offlineStorageService } from '../../../services/offline/offlineStorageService';
import { offlineSyncManager } from '../../../services/offline/offlineSyncManager';
import { OrderRepository } from '../../../repositories/OrderRepository';
import { subscribeToLogisticsChanges } from '../../../services/logisticsRealtimeService';
import { getLocalDateString } from '../../../utils/orderUtils';
import { excludeTestOrders } from '../../../../../shared-utils/testArtifactQueries';
import { isIdentifiedTestArtifact } from '../../../../../shared-utils/testArtifactPolicy';
import {
  buildDeliveryRouteItems,
  countDeliveryRouteOrders,
  computeDeliveryRouteStats,
  type DeliveryRouteDateScope,
  type DeliveryRouteItem,
} from '../domain/deliveryRouteBuilder';

export { checkOutOfOrderRisk } from '../utils/deliveryRouteRisk';
export type { DeliveryRouteDateScope, DeliveryRouteItem };

export function useDeliveryRoute(dateScope: DeliveryRouteDateScope = 'today') {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const lastSyncAtRef = useRef<string | undefined>(undefined);
  const hasLoadedOnceRef = useRef(false);

  const todayStr = useMemo(() => getLocalDateString(new Date()), []);

  const loadFromLocalCache = useCallback(async () => {
    try {
      const cached = await offlineStorageService.getWorkingSet<any[]>('logistics_orders');
      if (Array.isArray(cached?.data)) {
        const overlaid = await OrderRepository.overlayPendingLocalOrders(
          cached.data.filter((order) => !isIdentifiedTestArtifact(order))
        );
        hasLoadedOnceRef.current = overlaid.length > 0;
        setOrders(overlaid);
        setLoading(false);
      }
    } catch {}
  }, []);

  const fetchOrders = useCallback(async () => {
    try {
      if (!hasLoadedOnceRef.current) {
        await loadFromLocalCache();
      }

      const query = excludeTestOrders(
        supabase
          .from('orders')
          .select('id, status, created_at, updated_at, order_data')
          .or('order_data->>deleted.is.null,order_data->>deleted.eq.false')
      );
      const { data, error } = await query.order('created_at', { ascending: false }).limit(300);

      if (!error && data) {
        const visibleOrders = await OrderRepository.overlayPendingLocalOrders(
          data.filter((order) => !isIdentifiedTestArtifact(order))
        );
        hasLoadedOnceRef.current = true;
        setOrders(visibleOrders);
        await offlineStorageService.cacheWorkingSet('logistics_orders', visibleOrders);
      } else {
        await loadFromLocalCache();
      }
    } catch (err) {
      console.warn('[useDeliveryRoute] Erro ao buscar pedidos (usando cache):', err);
      await loadFromLocalCache();
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [loadFromLocalCache]);

  useEffect(() => {
    fetchOrders();
    const unsubRealtime = subscribeToLogisticsChanges(() => fetchOrders());
    const unsubSync = offlineSyncManager.subscribe((summary) => {
      if (summary.lastSyncAt !== lastSyncAtRef.current) {
        lastSyncAtRef.current = summary.lastSyncAt;
      }
      void loadFromLocalCache();
    });
    return () => {
      unsubRealtime();
      unsubSync();
    };
  }, [fetchOrders, loadFromLocalCache]);

  const routeItems = useMemo<DeliveryRouteItem[]>(
    () => buildDeliveryRouteItems(orders, dateScope, todayStr),
    [dateScope, orders, todayStr]
  );
  const dateScopeCounts = useMemo(
    () => ({
      today: countDeliveryRouteOrders(orders, 'today', todayStr),
      tomorrow: countDeliveryRouteOrders(orders, 'tomorrow', todayStr),
      next_days: countDeliveryRouteOrders(orders, 'next_days', todayStr),
    }),
    [orders, todayStr]
  );

  const currentDelivery = useMemo(
    () => routeItems.find((item) => item.isCurrent) || null,
    [routeItems]
  );

  const nextDelivery = useMemo(() => {
    if (currentDelivery) return currentDelivery;
    return routeItems.find((item) => item.isNext) || null;
  }, [currentDelivery, routeItems]);

  const stats = useMemo(() => computeDeliveryRouteStats(routeItems), [routeItems]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchOrders();
  };

  return {
    orders,
    routeItems,
    dateScopeCounts,
    currentDelivery,
    nextDelivery,
    stats,
    loading,
    refreshing,
    onRefresh,
    reload: fetchOrders,
  };
}
