import { supabase } from '../supabaseClient';

export interface OrderDeliverySearchInput {
  termo?: string;
  dataInicio?: string;
  dataFim?: string;
  status?: string;
  limite?: number;
}

const normalizeLimit = (value?: number): number => Math.min(Math.max(value ?? 10, 1), 20);

const asRecord = (value: unknown): Record<string, unknown> => value && typeof value === 'object' ? value as Record<string, unknown> : {};

const toSummary = (row: Record<string, unknown>) => {
  const data = asRecord(row.order_data);
  const customer = asRecord(data.customerData);
  const shipping = asRecord(data.shipping);
  const scheduling = asRecord(shipping.scheduling);
  return {
    id: String(row.id), codigo: String(row.order_number ?? data.orderIndex ?? data.order_index ?? ''),
    status: String(row.status ?? data.status ?? 'pending'), tipo: String(row.order_type ?? data.orderType ?? 'sale'),
    cliente: String(row.customer_name ?? customer.fullName ?? ''), valorTotal: Number(row.total_amount ?? asRecord(data.paymentsSummary).totalOrderValue ?? 0),
    criadoEm: row.created_at ?? null, atualizadoEm: row.updated_at ?? null,
    entrega: { status: data.deliveryStatus ?? row.delivery_status ?? null, data: scheduling.date ?? data.scheduledDate ?? row.scheduled_date ?? null,
      inicio: scheduling.startTime ?? row.schedule_start_time ?? null, fim: scheduling.endTime ?? row.schedule_end_time ?? null,
      endereco: customer.fullAddress ?? customer.address ?? null, observacoes: data.deliveryObservations ?? data.observations ?? null },
  };
};

export async function searchOrdersAndDeliveries(input: OrderDeliverySearchInput) {
  let query = supabase.from('order_list_items')
    .select('id, order_number, order_index, status, order_type, customer_name, total_value, created_at, updated_at, scheduled_date, schedule_start_time, schedule_end_time, delivery_status')
    .order(input.dataInicio || input.dataFim ? 'scheduled_date' : 'updated_at', { ascending: true })
    .limit(normalizeLimit(input.limite));

  if (input.status?.trim()) query = query.ilike('status', `%${input.status.trim()}%`);
  // Datas solicitadas ao agente representam a agenda operacional, nunca a
  // data de criação do pedido. A view expõe esse campo de forma indexável.
  if (input.dataInicio) query = query.gte('scheduled_date', input.dataInicio);
  if (input.dataFim) query = query.lte('scheduled_date', input.dataFim);
  if (input.termo?.trim()) {
    const term = input.termo.trim().replace(/[,%()]/g, '');
    if (term) query = query.or(`customer_name.ilike.%${term}%,order_number.ilike.%${term}%,order_index.ilike.%${term}%`);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map((row) => toSummary(row as Record<string, unknown>));
}

export async function getOrderDeliveryDetails(orderId: string): Promise<Record<string, unknown> | null> {
  const { data, error } = await supabase.from('orders').select('*').eq('id', orderId).maybeSingle();
  if (error) throw error;
  return data as Record<string, unknown> | null;
}
