import type Order from '../../types/order.type';
import { supabase } from '@/pages/utils/supabaseConfig';
import { TABLE_NAME } from './orderSyncConstants';

/**
 * Enriquece ordens de assistência com o código e método de entrega (ou retirada) do pedido de venda vinculado.
 * Garante que os selos operacionais e identificadores reflitam a venda original.
 */
export const enrichAssistanceLinkedOrders = async (orders: Order[]): Promise<void> => {
  const assistanceOrders = orders.filter(
    (o) => o.orderType === 'assistance' && Boolean(o.linkedOrderId)
  );

  if (assistanceOrders.length === 0) return;

  const linkedIds = Array.from(new Set(assistanceOrders.map((o) => o.linkedOrderId!)));

  try {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select('id, order_number, order_index, delivery_method, order_data')
      .in('id', linkedIds);

    if (error || !data) return;

    const linkedMap = new Map<string, { code: string; deliveryMethod: string }>();
    for (const row of data as any[]) {
      const code = String(
        row.order_index ??
        row.order_number ??
        row.order_data?.orderIndex ??
        row.order_data?.orderNumber ??
        row.id ??
        ''
      );
      const deliveryMethod =
        row.delivery_method || row.order_data?.shipping?.deliveryMethod || 'delivery';
      linkedMap.set(String(row.id), { code, deliveryMethod });
    }

    for (const order of assistanceOrders) {
      const info = linkedMap.get(order.linkedOrderId!);
      if (info) {
        if (!order.linkedOrderCode && info.code) {
          order.linkedOrderCode = info.code;
        }
        order.linkedOrderDeliveryMethod = info.deliveryMethod;
        if (order.shipping) {
          order.shipping.deliveryMethod = info.deliveryMethod as any;
        }
      }
    }
  } catch (err) {
    console.error('[enrichAssistanceLinkedOrders] Erro ao enriquecer pedidos vinculados:', err);
  }
};
