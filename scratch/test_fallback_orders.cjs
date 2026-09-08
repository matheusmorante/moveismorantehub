const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://hkoxhourxwlddgsfdgws.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhrb3hob3VyeHdsZGRnc2ZkZ3dzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgxNTg5MzgsImV4cCI6MjA5MzczNDkzOH0.vCNJeoR4wDl1BqESiyNhKpgviwxcx0cim8Dbl6MvdJI';

const supabase = createClient(supabaseUrl, supabaseKey);

const toListItem = (row) => {
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
      items: Array.isArray(data.items) ? data.items : (Array.isArray(row.items) ? row.items : []),
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

async function fetchMobileOrdersPage({ page, pageSize, search, status }) {
  const firstRow = (page - 1) * pageSize;
  const lastRow = firstRow + pageSize - 1;

  // 1. Tenta buscar da view otimizada order_list_items se existir
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
    if (!error && data) {
      return { items: data.map(toListItem), total: count || 0 };
    }
  } catch {
    // Segue para o fallback seguro na tabela orders
  }

  // 2. Fallback resiliente diretamente na tabela orders oficial
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
}

async function test() {
  const res = await fetchMobileOrdersPage({ page: 1, pageSize: 30, search: '', status: 'all' });
  console.log('Result total:', res.total);
  console.log('Items count:', res.items.length);
  console.log('First item sample:', {
    id: res.items[0].id,
    order_number: res.items[0].order_number,
    customer_name: res.items[0].customer_name,
    total_value: res.items[0].total_value,
    status: res.items[0].status,
    has_order_data: Boolean(res.items[0].order_data),
    items_count: res.items[0].order_data.items?.length
  });
}

test().catch(console.error);
