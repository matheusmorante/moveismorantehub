import { supabase } from '@/pages/utils/supabaseConfig';
import { fetchOrderScheduleRows } from '../../../../../../shared-utils/orderScheduleServerQuery';
import { ORDER_SUMMARY_COLUMNS } from '../../../../../../shared-utils/orderSummaryQuery';

export async function fetchAssemblyOrderRows(filters: Record<string, unknown> = {}, signal?: AbortSignal) {
  const rows = await fetchOrderScheduleRows(supabase, 'assembly_web', filters, ORDER_SUMMARY_COLUMNS, signal);
  return rows.map((row: any) => ({ ...row, order_data: { ...row.order_data, items: row.items || [] } }));
}
