import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../services/supabaseClient';
import { subscribeToLogisticsChanges } from '../../../services/logisticsRealtimeService';
import { offlineStorageService } from '../../../services/offline/offlineStorageService';
import { offlineSyncManager } from '../../../services/offline/offlineSyncManager';
import { OrderRepository } from '../../../repositories/OrderRepository';
import { excludeTestOrders } from '../../../../../shared-utils/testArtifactQueries';
import { isIdentifiedTestArtifact } from '../../../../../shared-utils/testArtifactPolicy';

export function useLogisticsScheduleData() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [handlingOptions, setHandlingOptions] = useState<any[]>([]);

  const fetchSettings = useCallback(async () => {
    try {
      const { data } = await supabase.from('settings').select('*').limit(1);
      if (data && data.length > 0) {
        const sData = data[0]?.data || data[0];
        const opts = [
          ...(sData.deliveryHandlingOptions || []),
          ...(sData.pickupHandlingOptions || []),
        ];
        setHandlingOptions(opts);
      }
    } catch {}
  }, []);

  const loadScheduleFromCache = useCallback(async () => {
    try {
      const cached = await offlineStorageService.getWorkingSet<any[]>('logistics_orders');
      if (Array.isArray(cached?.data)) {
        const overlaid = await OrderRepository.overlayPendingLocalOrders(
          cached.data.filter((order) => !isIdentifiedTestArtifact(order))
        );
        setOrders(overlaid);
        setLoading(false);
      }
    } catch {}
  }, []);

  const fetchSchedule = useCallback(async () => {
    try {
      const query = excludeTestOrders(
        supabase
          .from('orders')
          .select('id, status, created_at, order_data')
          .or('order_data->>deleted.is.null,order_data->>deleted.eq.false')
      );
      const { data, error } = await query.order('created_at', { ascending: false }).limit(300);

      if (!error && data) {
        const visibleOrders = await OrderRepository.overlayPendingLocalOrders(
          data.filter((order) => !isIdentifiedTestArtifact(order))
        );
        setOrders(visibleOrders);
        await offlineStorageService.cacheWorkingSet('logistics_orders', visibleOrders);
      } else {
        await loadScheduleFromCache();
      }
    } catch (err) {
      console.warn('[useLogisticsScheduleData] Erro ao buscar cronograma logístico:', err);
      await loadScheduleFromCache();
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [loadScheduleFromCache]);

  useEffect(() => {
    void loadScheduleFromCache();
    void fetchSchedule();
    void fetchSettings();

    const unsubRealtime = subscribeToLogisticsChanges(() => {
      void fetchSchedule();
      void fetchSettings();
    });
    const unsubSync = offlineSyncManager.subscribe(() => {
      void loadScheduleFromCache();
    });
    return () => {
      unsubRealtime();
      unsubSync();
    };
  }, [fetchSchedule, fetchSettings, loadScheduleFromCache]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    void fetchSchedule();
    void fetchSettings();
  }, [fetchSchedule, fetchSettings]);

  return {
    orders,
    loading,
    refreshing,
    handlingOptions,
    onRefresh,
    reload: fetchSchedule,
  };
}
