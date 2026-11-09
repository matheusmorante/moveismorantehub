import { useState, useEffect } from 'react';
import { supabase } from '../../../services/supabaseClient';
import { withAbortTimeout } from '../../../../../shared-utils/withAbortTimeout';
import { schedulePeriodFilters } from '../../../../../shared-utils/schedulePeriodFilters';
import { useScopedOrderSchedule } from './useScopedOrderSchedule';
import { offlineStorageService } from '../../../services/offline/offlineStorageService';
import { connectivityService } from '../../../services/offline/connectivityService';

export function useLogisticsScheduleData() {
  const schedule = useScopedOrderSchedule('logistics', schedulePeriodFilters('today_and_following'));
  const [handlingOptions, setHandlingOptions] = useState<any[]>([]);
  useEffect(() => {
    let active = true;
    let requestController: AbortController | undefined;
    let stopConnection: (() => void) | undefined;

    const loadRemoteOptions = async () => {
      if (!active || !connectivityService.connected) return;

      requestController?.abort();
      const controller = new AbortController();
      requestController = controller;

      const { data, error } = await withAbortTimeout(
        supabase
          .from('settings')
          .select('delivery:data->deliveryHandlingOptions,pickup:data->pickupHandlingOptions')
          .eq('id', 'app')
          .maybeSingle(),
        'logistica:opcoes-manuseio',
        15_000,
        controller.signal
      );
      if (error || !active || controller.signal.aborted) return;

      const settings = (data || {}) as { delivery?: unknown; pickup?: unknown };
      const options = [
        ...(Array.isArray(settings.delivery) ? settings.delivery : []),
        ...(Array.isArray(settings.pickup) ? settings.pickup : []),
      ];
      setHandlingOptions(options);
      await offlineStorageService.cacheWorkingSet('order_handling_options_v1', options).catch(() => {});
    };

    void (async () => {
      const cached = await offlineStorageService.getWorkingSet<any[]>('order_handling_options_v1').catch(() => null);
      if (!active) return;
      if (Array.isArray(cached?.data)) setHandlingOptions(cached.data);

      // subscribe() also reports the current state, so the same path handles
      // both an already-online screen and a later reconnection.
      stopConnection = connectivityService.subscribe((connected) => {
        if (connected) void loadRemoteOptions().catch(() => {});
      });
    })().catch(() => {});
    return () => {
      active = false;
      requestController?.abort();
      stopConnection?.();
    };
  }, []);
  return { ...schedule, handlingOptions };
}
