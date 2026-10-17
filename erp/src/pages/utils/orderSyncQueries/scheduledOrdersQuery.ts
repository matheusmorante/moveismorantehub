import { excludeTestOrders } from '../../../../../shared-utils/testArtifactQueries';
import Order from '../../types/order.type';
import { supabase } from '@/pages/utils/supabaseConfig';
import { capitalizeOrder } from '../formatters';
import { mapOrderFromDatabase } from '../orderMapper';
import { TABLE_NAME } from './orderSyncConstants';
import { isValidOrderRow, enrichOrdersWithPeopleOrigins } from './orderPeopleEnrichment';

export const fetchScheduledAndDraftOrders = async (): Promise<Order[]> => {
  try {
    const { data, error } = await excludeTestOrders(supabase
      .from(TABLE_NAME)
      .select(`
                id, order_number, order_index, status, order_type, customer_id, customer_name,
                seller_id, seller_name, total_amount, payment_method, channel, notes,
                scheduled_date, scheduled_start_time, scheduled_end_time, delivery_method,
                delivery_status, delivery_arrived_at, delivery_started_at, delivery_finished_at,
                marketing_origin, items_subtotal, total_discount, total_cost, stock_processed,
                is_stock_checked, is_registered_in_bling, deleted, deleted_at, return_order_id,
                linked_order_id, returned_total_amount, original_sold_total, return_kind,
                created_at, updated_at,
                shipping_data:order_data->shipping,
                order_items(id, order_id, item_index, product_id, variation_id, code, description, quantity, unit_price, unit_discount, cost_price, handling_type, is_temporary_product),
                order_payments(payment_index, payment_method, amount, fee, fee_type, status, installments, paid_at)
            `))
      .or('deleted.is.null,deleted.eq.false')
      .in('status', ['scheduled', 'draft'])
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[OrdersSync] Erro ao buscar pedidos agendados:', error);
      return [];
    }

    const rows = Array.isArray(data) ? data : [];
    const mappedOrders = rows.filter(isValidOrderRow).map((row: any) => {
      try {
        return mapOrderFromDatabase(row);
      } catch {
        return capitalizeOrder({ ...(row.order_data || {}), id: String(row.id) } as Order);
      }
    });

    return await enrichOrdersWithPeopleOrigins(mappedOrders);
  } catch (error) {
    console.error('[OrdersSync] Exception fetching scheduled orders:', error);
    return [];
  }
};
