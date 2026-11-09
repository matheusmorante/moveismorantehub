import { supabase } from './supabaseClient';
import { OrderRepository } from '../repositories/OrderRepository';
import { connectivityService } from './offline/connectivityService';
import { offlineStorageService } from './offline/offlineStorageService';
import { withAbortTimeout } from '../../../shared-utils/withAbortTimeout';
import { isOrderSummary } from '../../../shared-utils/orderSummaryQuery';
import { isIdentifiedTestArtifact } from '../../../shared-utils/testArtifactPolicy';

const MOBILE_ORDER_DETAIL_COLUMNS =
  'id,status,order_type,order_number,order_index,customer_name,total_amount,order_data,version,updated_at,created_at,delivery_status';

async function cachedDetails(order: any) {
  const local = await OrderRepository.getById(order.id);
  if (local && !isOrderSummary(local.orderData)) return {
    ...order, id: local.id, status: local.status, order_type: local.orderType,
    customer_name: local.customerName, total_amount: local.totalAmount,
    order_data: local.orderData, __orderSummary: false,
  };
  const cached = await offlineStorageService.getWorkingSet<any[]>('logistics_orders').catch(() => null);
  const found = cached?.data?.find((row) => row?.id === order.id && !isOrderSummary(row));
  if (found) return found;
  return !isOrderSummary(order) && !order.__notificationOrderReference ? order : null;
}

export async function loadMobileOrderDetails(order: any, signal?: AbortSignal): Promise<any> {
  if (!order?.id) throw new Error('Pedido sem identificação.');
  let result: any = null;
  if (connectivityService.connected) {
    try {
      const { data, error } = await withAbortTimeout(
        supabase
          .from('orders')
          .select(MOBILE_ORDER_DETAIL_COLUMNS)
          .eq('id', order.id)
          .maybeSingle(),
        'app:detalhes-pedido',
        15_000,
        signal
      );
      if (error) throw error;
      if (!data) throw new Error('Pedido não encontrado ou sem permissão de acesso.');
      if (!isIdentifiedTestArtifact(data.order_data)) await OrderRepository.saveLocal({
        id: data.id, status: data.status, orderType: data.order_type, customerName: data.customer_name,
        totalAmount: data.total_amount, orderData: data.order_data || {}, version: data.version ?? 1,
        updatedAt: data.updated_at || data.created_at, syncedAt: new Date().toISOString(), isPendingLocal: false,
      }, { preservePending: true });
      result = data;
    } catch (cause) {
      if (signal?.aborted) throw cause;
      if (connectivityService.connected) throw cause;
    }
  }
  if (!result) result = await cachedDetails(order);
  if (!result) throw new Error('Os detalhes deste pedido ainda não estão salvos no aparelho. Conecte-se para carregá-los.');
  if (signal?.aborted) throw new Error('Consulta cancelada.');
  const [overlaid] = await OrderRepository.overlayPendingLocalOrders([result]);
  return { ...(overlaid || result), __orderSummary: false };
}
