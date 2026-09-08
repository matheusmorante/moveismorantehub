import { supabase } from '../../../services/supabaseClient';

export interface MobileOrderListItem {
  id: string;
  order_number: string | null;
  created_at: string | null;
  status: string;
  order_type: string;
  customer_name: string;
  total_value: number;
  order_data: Record<string, unknown>;
}

interface OrderListRow {
  id: string;
  order_number: string | null;
  created_at: string | null;
  status: string | null;
  order_type: string | null;
  order_index: string | null;
  customer_name: string | null;
  total_value: number | string | null;
  delivery_method: string | null;
  scheduled_date: string | null;
  schedule_start_time: string | null;
  schedule_end_time: string | null;
  pending_scheduling: boolean | null;
  handling_type: string | null;
  delivery_status: string | null;
  delivery_arrived_at: string | null;
  delivery_started_at: string | null;
  unattended_reason: string | null;
  marketing_origin: string | null;
  is_stock_checked: boolean | null;
  is_registered_in_bling: boolean | null;
  item_handling: unknown;
}

const toListItem = (row: any): MobileOrderListItem => {
  const data = row.order_data || {};
  const customerName = row.customer_name || data.customerData?.fullName || data.customer_name || '';
  const orderNumber = row.order_number || data.orderIndex || data.order_index || '';
  const orderStatus = row.status || data.status || 'pending';
  const orderType = data.orderType || data.order_type || row.order_type || 'sale';
  const totalValue = Number(row.total_amount ?? data.paymentsSummary?.totalOrderValue ?? row.total_value ?? 0);

  return {
    id: String(row.id),
    order_number: orderNumber,
    created_at: row.created_at || data.createdAt || data.date || null,
    status: orderStatus,
    order_type: orderType,
    customer_name: customerName,
    total_value: totalValue,
    order_data: {
      ...data,
      id: String(row.id),
      orderIndex: data.orderIndex || data.order_index || orderNumber || String(row.id),
      status: orderStatus,
      orderType: orderType,
      customerData: data.customerData || { fullName: customerName },
      paymentsSummary: data.paymentsSummary || { totalOrderValue: totalValue },
      handlingType: data.handlingType || data.handling || row.handling_type || '',
      deliveryStatus: data.deliveryStatus || row.delivery_status || '',
      deliveryArrivedAt: data.deliveryArrivedAt || row.delivery_arrived_at || '',
      deliveryStartedAt: data.deliveryStartedAt || row.delivery_started_at || '',
      unattendedReason: data.unattendedReason || row.unattended_reason || '',
      marketingOrigin: data.marketingOrigin || data.customerData?.marketingOrigin || row.marketing_origin || '',
      isStockChecked: Boolean(data.isStockChecked ?? row.is_stock_checked),
      isRegisteredInBling: Boolean(data.isRegisteredInBling ?? row.is_registered_in_bling),
      items: Array.isArray(data.items) ? data.items : (Array.isArray(row.items) ? row.items : (Array.isArray(row.item_handling) ? row.item_handling : [])),
      shipping: data.shipping || {
        deliveryMethod: data.deliveryMethod || row.delivery_method || '',
        scheduling: data.scheduling || {
          date: data.scheduledDate || row.scheduled_date || '',
          startTime: row.schedule_start_time || '',
          endTime: row.schedule_end_time || '',
          pendingScheduling: Boolean(row.pending_scheduling),
        },
      },
    },
  };
};

export const fetchMobileOrdersPage = async ({
  page,
  pageSize,
  search,
  status,
}: {
  page: number;
  pageSize: number;
  search: string;
  status: string;
}): Promise<{ items: MobileOrderListItem[]; total: number }> => {
  const firstRow = (page - 1) * pageSize;
  const lastRow = firstRow + pageSize - 1;

  // 1. Tenta buscar da view otimizada order_list_items caso ela esteja disponível
  try {
    let query = supabase
      .from('order_list_items')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(firstRow, lastRow);

    const term = search.trim().replace(/[,%()]/g, '');
    if (term) {
      query = query.or(`customer_name.ilike.%${term}%,order_number.ilike.%${term}%,order_index.ilike.%${term}%`);
    }
    if (status === 'agendados') query = query.or('status.ilike.%scheduled%,status.ilike.%agendad%');
    if (status === 'concluidos') query = query.or('status.ilike.%fulfilled%,status.ilike.%atendid%,status.ilike.%concluid%,status.ilike.%entreg%,status.ilike.%finaliz%');
    if (status === 'rascunhos') query = query.or('status.ilike.%draft%,status.ilike.%rascunh%');

    const { data, count, error } = await query;
    if (!error && data && data.length > 0) {
      return {
        items: data.map(toListItem),
        total: count || 0,
      };
    }
  } catch {
    // Prossegue com fallback seguro para a tabela oficial orders
  }

  // 2. Fallback resiliente direto na tabela orders oficial (sempre existente e populada)
  let query = supabase
    .from('orders')
    .select('id, order_number, status, customer_name, total_amount, created_at, updated_at, order_data', { count: 'exact' })
    .order('created_at', { ascending: false });

  const term = search.trim().replace(/[,%()]/g, '');
  if (term) {
    query = query.or(`customer_name.ilike.%${term}%,order_number.ilike.%${term}%`);
  }
  if (status === 'agendados') query = query.or('status.ilike.%scheduled%,status.ilike.%agendad%');
  if (status === 'concluidos') query = query.or('status.ilike.%fulfilled%,status.ilike.%atendid%,status.ilike.%concluid%,status.ilike.%entreg%,status.ilike.%finaliz%');
  if (status === 'rascunhos') query = query.or('status.ilike.%draft%,status.ilike.%rascunh%');

  query = query.range(firstRow, lastRow);

  const { data, count, error } = await query;
  if (error) throw error;

  return {
    items: (data || []).map(toListItem),
    total: count || 0,
  };
};
