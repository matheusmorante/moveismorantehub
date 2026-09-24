import { supabase } from '../../../services/supabaseClient';

export interface LinkedProductOrder { id: string; orderNumber: string; date: string; customer: string; quantity: number; type: string; }

export const fetchLinkedProductOrders = async (productId: string, variationId?: string): Promise<LinkedProductOrder[]> => {
  let itemQuery = supabase.from('order_items').select('order_id, quantity').order('order_id');
  itemQuery = variationId ? itemQuery.eq('variation_id', variationId) : itemQuery.eq('product_id', productId);
  const { data: itemRows, error: itemError } = await itemQuery;
  if (itemError) throw itemError;
  const quantities = new Map<string, number>();
  (itemRows || []).forEach((row: any) => quantities.set(String(row.order_id), (quantities.get(String(row.order_id)) || 0) + Number(row.quantity || 0)));
  if (quantities.size === 0) return [];
  const { data: orders, error } = await supabase.from('orders').select('id, order_number, created_at, customer_name, order_type, deleted').in('id', [...quantities.keys()]).eq('deleted', false).neq('order_type', 'budget').order('created_at', { ascending: false });
  if (error) throw error;
  return (orders || []).map((order: any) => ({ id: String(order.id), orderNumber: order.order_number || String(order.id), date: order.created_at, customer: order.customer_name || 'Cliente não informado', quantity: quantities.get(String(order.id)) || 0, type: order.order_type || 'sale' }));
};
