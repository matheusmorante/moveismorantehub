import { supabase } from '../../../services/supabaseClient';
import { excludeTestOrders } from '../../../../../shared-utils/testArtifactQueries';
import { isIdentifiedTestArtifact } from '../../../../../shared-utils/testArtifactPolicy';

export interface LinkedProductOrder {
  id: string;
  orderNumber: string;
  date: string;
  customer: string;
  quantity: number;
  type: string;
  status: string;
  unitPrice: number;
}

export const fetchLinkedProductOrders = async (
  productId: string,
  variationId?: string
): Promise<LinkedProductOrder[]> => {
  let itemQuery = supabase
    .from('order_items')
    .select('order_id, item_index, quantity, unit_price')
    .order('order_id')
    .order('item_index');
  itemQuery = variationId
    ? itemQuery.eq('variation_id', variationId)
    : itemQuery.eq('product_id', productId);
  const { data: itemRows, error: itemError } = await itemQuery;
  if (itemError) throw itemError;
  const itemsByOrder = new Map<string, { quantity: number; unitPrice: number }>();
  (itemRows || []).forEach((row: any) => {
    const orderId = String(row.order_id);
    const current = itemsByOrder.get(orderId);
    itemsByOrder.set(orderId, {
      quantity: (current?.quantity || 0) + Number(row.quantity || 0),
      // The ERP displays the first matching line's unit price and sums all matching quantities.
      unitPrice: current?.unitPrice ?? Number(row.unit_price || 0),
    });
  });
  if (itemsByOrder.size === 0) return [];
  const { data: orders, error } = await excludeTestOrders(
    supabase
      .from('orders')
      .select(
        'id, order_number, created_at, customer_name, order_type, status, deleted, order_data'
      )
      .in('id', [...itemsByOrder.keys()])
      .eq('deleted', false)
      .neq('order_type', 'budget')
      .order('created_at', { ascending: false })
  );
  if (error) throw error;
  return (orders || [])
    .filter((order: any) => !isIdentifiedTestArtifact(order))
    .map((order: any) => ({
      id: String(order.id),
      orderNumber: order.order_number || String(order.id),
      date: order.created_at,
      customer: order.customer_name || 'Cliente não informado',
      quantity: itemsByOrder.get(String(order.id))?.quantity || 0,
      type: order.order_type || 'sale',
      status: order.status || 'Pendente',
      unitPrice: itemsByOrder.get(String(order.id))?.unitPrice || 0,
    }));
};
