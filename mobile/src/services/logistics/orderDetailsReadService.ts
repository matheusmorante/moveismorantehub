import { supabase } from '../supabaseClient';
import { OrderRepository } from '../../repositories/OrderRepository';
import { connectivityService } from '../offline/connectivityService';
import { offlineStorageService } from '../offline/offlineStorageService';
import { withAbortTimeout } from '../../../../shared-utils/core/withAbortTimeout';
import { isOrderSummary } from '../../../../shared-utils/orderSummaryQuery';
import { isIdentifiedTestArtifact } from '../../../../shared-utils/testing/testArtifactPolicy';
import { hasSeparateFulfillments } from '../../../../shared-utils/fulfillmentScheduleGuard';
import { attachDeliveryOperationStates, projectOperationOrder } from '../../features/orders/services/deliveryOperationState';

const MOBILE_ORDER_DETAIL_COLUMNS =
  'id,status,order_type,order_number,order_index,customer_name,total_amount,order_data,version,updated_at,created_at,delivery_status';
// Keeps read provenance out of the order object and persisted order data.
const serverConfirmedOrderDetails = new WeakSet<object>();

export const isServerConfirmedOrderDetails = (order: unknown): boolean => {
  if (order === null || typeof order !== 'object') return false;
  return serverConfirmedOrderDetails.has(order);
};

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
  let loadedFromServer = false;
  if (connectivityService.connected) {
    try {
      const operationRequested = Boolean(order.scheduleAppointment?.appointmentId);
      const read = (columns: string) => withAbortTimeout(
        supabase.from('orders').select(columns).eq('id', order.id).maybeSingle(),
        'app:detalhes-pedido', 15_000, signal
      );
      let { data, error } = await read(operationRequested
        ? `${MOBILE_ORDER_DETAIL_COLUMNS},order_delivery_operations(appointment_id,revision,state),order_payments(payment_index,payment_method,amount,fee,fee_type,status,installments,paid_at)`
        : MOBILE_ORDER_DETAIL_COLUMNS);
      if (operationRequested && error && ['PGRST200', '42P01'].includes(String(error.code))) {
        ({ data, error } = await read(MOBILE_ORDER_DETAIL_COLUMNS));
      }
      if (error) throw error;
      if (!data) throw new Error('Pedido não encontrado ou sem permissão de acesso.');
      let detail = data as unknown as Record<string, any>;
      if (operationRequested && Array.isArray(detail.order_delivery_operations)) {
        const attached = attachDeliveryOperationStates(detail);
        if (hasSeparateFulfillments(attached.order_data?.shipping?.scheduling, attached.order_data?.items) || attached.order_data?.deliveryOperations) {
          attached.order_data = { ...attached.order_data, __independentOperationRead: true };
        }
        detail = attached;
      }
      if (!isIdentifiedTestArtifact(detail.order_data)) await OrderRepository.saveLocal({
        id: detail.id, status: detail.status, orderType: detail.order_type, customerName: detail.customer_name,
        totalAmount: detail.total_amount, orderData: detail.order_data || {}, version: detail.version ?? 1,
        updatedAt: detail.updated_at || detail.created_at, syncedAt: new Date().toISOString(), isPendingLocal: false,
      }, { preservePending: true });
      result = detail;
      loadedFromServer = true;
    } catch (cause) {
      if (signal?.aborted) throw cause;
      if (connectivityService.connected) throw cause;
    }
  }
  if (!result) result = await cachedDetails(order);
  if (!result) throw new Error('Os detalhes deste pedido ainda não estão salvos no aparelho. Conecte-se para carregá-los.');
  if (signal?.aborted) throw new Error('Consulta cancelada.');
  const [overlaid] = await OrderRepository.overlayPendingLocalOrders([result]);
  const full = { ...(overlaid || result), __orderSummary: false };
  if (order.scheduleAppointment?.appointmentId && (full.order_data?.__independentOperationRead || full.order_data?.deliveryOperations)) {
    const projected = projectOperationOrder({ ...full, scheduleAppointment: order.scheduleAppointment }, full.order_data);
    if (loadedFromServer) serverConfirmedOrderDetails.add(projected);
    return projected;
  }
  if (loadedFromServer) serverConfirmedOrderDetails.add(full);
  return full;
}
