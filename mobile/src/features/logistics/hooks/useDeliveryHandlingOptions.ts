import { useEffect, useState } from 'react';
import type { AssemblyHandlingOption } from '../../../utils/aiSummaryHelper';
import { offlineStorageService } from '../../../services/offline/offlineStorageService';
import { connectivityService } from '../../../services/offline/connectivityService';
import { supabase } from '../../../services/supabaseClient';
import { withAbortTimeout } from '../../../../../shared-utils/core/withAbortTimeout';

/** Carrega opções de manuseio de entregas e montagens com fallback offline e sincronização remota. */
export function useDeliveryHandlingOptions() {
  const [handlingOptions, setHandlingOptions] = useState<AssemblyHandlingOption[]>([]);

  useEffect(() => {
    let active = true;
    let requestController: AbortController | undefined;
    let stopConnection: (() => void) | undefined;

    const loadRemoteHandlingOptions = async () => {
      if (!active || !connectivityService.connected) return;

      requestController?.abort();
      const controller = new AbortController();
      requestController = controller;

      try {
        const { data, error } = await withAbortTimeout(
          supabase
            .from('settings')
            .select('delivery:data->deliveryHandlingOptions,pickup:data->pickupHandlingOptions')
            .eq('id', 'app')
            .limit(1),
          'operacoes:opcoes-manuseio',
          15_000,
          controller.signal
        );
        if (!active || controller.signal.aborted || error || !data?.length) return;

        const settings = (data[0] || {}) as { delivery?: unknown; pickup?: unknown };
        const deliveryOptions = settings.delivery;
        const pickupOptions = settings.pickup;
        if (
          (deliveryOptions != null && !Array.isArray(deliveryOptions)) ||
          (pickupOptions != null && !Array.isArray(pickupOptions))
        ) {
          return;
        }

        const options = [
          ...(deliveryOptions || []),
          ...(pickupOptions || []),
        ] as AssemblyHandlingOption[];
        setHandlingOptions(options);
        void offlineStorageService
          .cacheWorkingSet('order_handling_options_v1', options)
          .catch(() => {});
      } catch {
        // Mantém as últimas opções conhecidas até uma nova tentativa ou recarga manual.
      }
    };

    const loadCachedHandlingOptions = async () => {
      const cached = await offlineStorageService
        .getWorkingSet<AssemblyHandlingOption[]>('order_handling_options_v1')
        .catch(() => null);
      if (active && Array.isArray(cached?.data)) setHandlingOptions(cached.data);
      if (!active) return;

      stopConnection = connectivityService.subscribe((connected) => {
        if (connected) void loadRemoteHandlingOptions();
      });
    };

    void loadCachedHandlingOptions();
    return () => {
      active = false;
      requestController?.abort();
      stopConnection?.();
    };
  }, []);

  return handlingOptions;
}
