import type { DeliveryRouteItem } from '../hooks/useDeliveryRoute';
import { supabase } from '../../../services/supabaseClient';
import { withTimeout } from '../../../../../shared-utils/core/withTimeout';

export { calculateOptimizedDeliveryRoute as calculateOptimizedRoute } from '../domain/calculateOptimizedDeliveryRoute';
export type { OptimizationResult } from '../domain/calculateOptimizedDeliveryRoute';

/** Persiste a sequência por operação, sem gravar snapshots resumidos sobre o pedido. */
export const applyOptimizedSequence = async (
  optimizedItems: DeliveryRouteItem[]
): Promise<boolean> => {
  try {
    const updates = optimizedItems.map((item, index) => ({
      orderId: String(item.order?.id || ''),
      operationId: item.order?.scheduleAppointment?.appointmentId || null,
      sequence: index + 1,
    }));
    if (updates.some((entry) => !entry.orderId)) return false;
    const result = await withTimeout((supabase as any).rpc('set_order_operation_route_sequences', {
      p_updates: updates,
    }), 15_000, null, 'operacoes:otimizar-rota');
    if (!result || (result as any).error || (result as any).data !== true) {
      console.error(
        '[RouteOptimization] Falha ao persistir nova ordem do roteiro:',
        (result as any)?.error || 'Resposta não confirmada.'
      );
      return false;
    }

    return true;
  } catch (error) {
    console.error('[RouteOptimization] Falha ao persistir nova ordem do roteiro:', error);
    return false;
  }
};
