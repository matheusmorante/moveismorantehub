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
    const controller = new AbortController();
    void (async () => {
      const cached = await offlineStorageService.getWorkingSet<any[]>('order_handling_options_v1').catch(() => null);
      if (!controller.signal.aborted && Array.isArray(cached?.data)) setHandlingOptions(cached.data);
      if (!connectivityService.connected) return;
      const { data, error } = await withAbortTimeout(supabase.from('settings').select('delivery:data->deliveryHandlingOptions,pickup:data->pickupHandlingOptions').eq('id', 'app').maybeSingle(),
        'logistica:opcoes-manuseio', 15_000, controller.signal);
      if (error || controller.signal.aborted) return;
      const settings = data || {};
      const options = [...(Array.isArray(settings.delivery) ? settings.delivery : []), ...(Array.isArray(settings.pickup) ? settings.pickup : [])];
      setHandlingOptions(options);
      await offlineStorageService.cacheWorkingSet('order_handling_options_v1', options).catch(() => {});
    })().catch(() => {});
    return () => controller.abort();
  }, []);
  return { ...schedule, handlingOptions };
}
