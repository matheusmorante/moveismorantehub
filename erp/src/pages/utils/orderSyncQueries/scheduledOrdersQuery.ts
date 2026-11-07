import { fetchOrderScheduleRows } from '../../../../../shared-utils/orderScheduleServerQuery';
import Order from '../../types/order.type';
import { supabase } from '@/pages/utils/supabaseConfig';
import { capitalizeOrder } from '../formatters';
import { mapOrderFromDatabase } from '../orderMapper';
import { ORDER_SUMMARY_COLUMNS } from '../../../../../shared-utils/orderSummaryQuery';
import { isValidOrderRow, enrichOrdersWithPeopleOrigins } from './orderPeopleEnrichment';

export const fetchScheduledAndDraftOrders = async (
  options: { throwOnError?: boolean; filters?: Record<string, unknown>; signal?: AbortSignal } = {}
): Promise<Order[]> => {
  try {
    const rows = await fetchOrderScheduleRows(supabase, 'erp_schedule',
      options.filters || { types: ['delivery', 'pickup', 'assistance'] }, ORDER_SUMMARY_COLUMNS, options.signal);
    const mappedOrders = rows.filter(isValidOrderRow).map((row: any) => {
      try {
        return mapOrderFromDatabase(row);
      } catch {
        return capitalizeOrder({ ...(row.order_data || {}), id: String(row.id) } as Order);
      }
    });

    return await enrichOrdersWithPeopleOrigins(mappedOrders);
  } catch (error) {
    if (options.throwOnError) throw error;
    console.error('[OrdersSync] Exception fetching scheduled orders:', error);
    return [];
  }
};
