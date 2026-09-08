import type { DeliveryRouteItem } from '../hooks/useDeliveryRoute';
import { supabase } from '../../../services/supabaseClient';

export { calculateOptimizedDeliveryRoute as calculateOptimizedRoute } from '../domain/calculateOptimizedDeliveryRoute';
export type { OptimizationResult } from '../domain/calculateOptimizedDeliveryRoute';

/** Persiste somente a sequência sugerida no JSON order_data da tabela orders. */
export const applyOptimizedSequence = async (optimizedItems: DeliveryRouteItem[]): Promise<boolean> => {
  try {
    const results = await Promise.all(optimizedItems.map((item, index) => {
      const orderData = item.order.order_data || {};
      return supabase
        .from('orders')
        .update({
          order_data: { ...orderData, routeSequence: index + 1 },
          updated_at: new Date().toISOString(),
        })
        .eq('id', item.id);
    }));

    const failedUpdate = results.find(result => result.error);
    if (failedUpdate?.error) {
      console.error('[RouteOptimization] Falha ao persistir nova ordem do roteiro:', failedUpdate.error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('[RouteOptimization] Falha ao persistir nova ordem do roteiro:', error);
    return false;
  }
};
