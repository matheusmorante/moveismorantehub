import { supabase } from '@/pages/utils/supabaseConfig';
import { ERP_LIST_PAGE_SIZES } from '../../../../../../shared-utils/listingFormSchemas';
import type { CustomerReference } from './customerOrderCounts';

const CUSTOMER_ORDER_COUNT_PAGE_SIZE = ERP_LIST_PAGE_SIZES[0];

type CustomerOrderCountRpcRow = {
  customer_id: string;
  order_count: number | string;
};

export async function fetchCustomerOrderCounts(
  customers: CustomerReference[]
): Promise<Record<string, number>> {
  if (customers.length > CUSTOMER_ORDER_COUNT_PAGE_SIZE) {
    throw new Error('A contagem aceita somente os clientes da página atual.');
  }

  const customersWithIds = customers.filter(
    (customer): customer is CustomerReference & { id: string } =>
      typeof customer.id === 'string' && customer.id.length > 0
  );
  const requestedIds = new Set(customersWithIds.map((customer) => customer.id));
  if (!requestedIds.size) return {};

  const { data, error } = await supabase.rpc('customer_order_counts_for_page', {
    p_customers: customersWithIds.map((customer) => ({
      id: customer.id,
      fullName: customer.fullName ?? null,
    })),
  });

  if (error) throw error;
  if (!Array.isArray(data)) {
    throw new Error('A consulta não retornou as contagens dos clientes.');
  }

  const counts = new Map<string, number>();
  for (const row of data as CustomerOrderCountRpcRow[]) {
    const count = Number(row.order_count);
    if (
      typeof row.customer_id !== 'string' ||
      !requestedIds.has(row.customer_id) ||
      counts.has(row.customer_id) ||
      !Number.isSafeInteger(count) ||
      count < 0
    ) {
      throw new Error('A consulta retornou uma contagem inválida.');
    }
    counts.set(row.customer_id, count);
  }

  // Customers without a returned row have a count of zero; the table already
  // treats a missing count as zero.
  return Object.fromEntries(counts);
}
