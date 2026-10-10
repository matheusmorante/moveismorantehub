import { excludeTestOrders } from '../../../../../../shared-utils/testArtifactQueries';
import { supabase } from '@/pages/utils/supabaseConfig';

const ASSEMBLY_ORDERS_PAGE_SIZE = 50;
const ASSEMBLY_ORDER_COLUMNS =
  'id, status, created_at, order_data, deleted, order_number, order_index, customer_name, delivery_method, scheduled_date';

export async function fetchAssemblyOrderRows() {
  const rows: Record<string, any>[] = [];

  for (let from = 0; ; from += ASSEMBLY_ORDERS_PAGE_SIZE) {
    const { data, error } = await excludeTestOrders(
      supabase.from('orders').select(ASSEMBLY_ORDER_COLUMNS)
    )
      .or('order_data->>deleted.is.null,order_data->>deleted.eq.false')
      .or('order_data->>is_test.is.null,order_data->>is_test.eq.false')
      .order('created_at', { ascending: false })
      .order('id', { ascending: true })
      .range(from, from + ASSEMBLY_ORDERS_PAGE_SIZE - 1);

    if (error) throw error;

    const page = Array.isArray(data) ? data : [];
    rows.push(...page);
    if (page.length < ASSEMBLY_ORDERS_PAGE_SIZE) break;
  }

  return rows;
}
