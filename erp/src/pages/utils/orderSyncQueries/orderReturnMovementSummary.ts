import type Order from '../../types/order.type';
import type Item from '../../types/items.type';
import { supabase } from '../supabaseConfig';
import { getReturnableQuantities } from '../returnQuantityRules';
import { withTimeout } from '../../../../../shared-utils/withTimeout';

export interface LinkedReturnRow {
  id: string;
  status?: string;
  linked_order_id?: string | null;
  legacy_parent_id?: string | null;
  items?: Item[] | null;
  legacy_items?: Item[] | null;
  stock_processed?: boolean;
  stock_reversed?: boolean;
  moved_product_ids?: string[];
}

/** Read projection only: reservations/cancellations are not physical receipts. */
export function summarizeReceivedReturns(order: Order, rows: readonly LinkedReturnRow[]): NonNullable<Order['linkedReturnMovement']> {
  const received = rows.filter(row => row.status !== 'cancelled' && !row.stock_reversed
    && (row.status === 'fulfilled' || row.stock_processed === true));
  const sold = order.items || [];
  const remaining = getReturnableQuantities(sold, received.map(row => ({
    status: row.status, items: Array.isArray(row.items) && row.items.length ? row.items : row.legacy_items || [],
  })));
  const anyReceived = sold.some((item, index) => remaining[index] < Number(item.quantity || 0));
  return {
    status: received.length ? 'fulfilled' : rows.some(row => row.status !== 'cancelled') ? 'scheduled' : 'cancelled',
    returnKind: anyReceived ? remaining.every(quantity => quantity === 0) ? 'complete' : 'partial' : undefined,
    stockProcessed: received.length > 0 && received.every(row => row.stock_processed === true),
    stockReversed: false,
    items: sold.flatMap((item, index) => {
      const quantity = Number(item.quantity || 0) - remaining[index];
      return quantity > 0 ? [{ ...item, originalOrderItemIndex: index, quantity, returnedQuantity: quantity }] : [];
    }),
    movedProductIds: [...new Set(received.flatMap(row => row.moved_product_ids || []))],
  };
}

export async function enrichLinkedReturnMovements(orders: Order[]): Promise<void> {
  const sales = orders.filter(order => order.orderType !== 'return' && order.id && order.returnOrderId);
  if (!sales.length) return;
  const saleIds = sales.map(order => order.id!);
  const returnIds = [...new Set(sales.map(order => order.returnOrderId!))];
  const projection = 'id,status,linked_order_id,legacy_parent_id:order_data->>linkedOrderId,items,legacy_items:order_data->items,stock_processed:order_data->returnStockProcessed,stock_reversed:order_data->returnStockReversed,moved_product_ids:order_data->movedProductIds';
  try {
    const results = await withTimeout(Promise.all([
      supabase.from('orders').select(projection, { count: 'exact' }).eq('order_type', 'return').in('linked_order_id', saleIds).limit(1001),
      supabase.from('orders').select(projection, { count: 'exact' }).eq('order_type', 'return').in('order_data->>linkedOrderId', saleIds).limit(1001),
      supabase.from('orders').select(projection, { count: 'exact' }).in('id', returnIds).limit(1001),
    ]), 15_000, null, 'pedidos:resumo-devolucoes');
    if (!results || results.some(result => result.error || (result.count ?? 0) > (result.data?.length ?? 0) || (result.data?.length ?? 0) > 1000)) {
      throw new Error('Não foi possível conferir todas as devoluções vinculadas.');
    }
    const rows = [...new Map(results.flatMap(result => result.data || []).map(row => [row.id, row as unknown as LinkedReturnRow])).values()];
    for (const sale of sales) {
      sale.linkedReturnMovement = summarizeReceivedReturns(sale, rows.filter(row => {
        const parent = row.linked_order_id || row.legacy_parent_id;
        return parent ? parent === sale.id : row.id === sale.returnOrderId;
      }));
    }
  } catch (error) {
    console.warn('[OrdersService] Não foi possível conferir as devoluções vinculadas:', error);
    for (const sale of sales) sale.linkedReturnMovement = { status: 'unknown' };
  }
}
