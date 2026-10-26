import { SupabaseClient } from '@supabase/supabase-js';
import { withTimeout } from '../../../../../shared-utils/withTimeout';
import { supportCustomerRecordFiltersSchema } from '../../../../../shared-utils/customerSupportFormSchemas';

export type SupportCustomerOrderGroup = 'sales' | 'budgets' | 'delivery' | 'assistance' | 'returns';

export interface SupportCustomerOrderPage {
  records: SupportOrderSummary[];
  page: number;
  pageSize: number;
  total: number;
}

export interface SupportOrderSummary {
  id: string;
  orderNumber: string;
  status: string; // 'completed', 'active', 'canceled'/'cancelled', etc.
  totalAmount: number;
  paymentMethod?: string | null;
  deliveryStatus?: string | null;
  scheduledDate?: string | null;
  scheduledStartTime?: string | null;
  scheduledEndTime?: string | null;
  deliveryMethod?: string | null;
  deliveryFinishedAt?: string | null;
  assemblyAppointments?: Array<{
    item: string;
    date: string;
    time: string | null;
    type: string;
    status: string;
  }>;
  itemsCount: number;
  itemsPreview: string;
  lineItems?: Array<{ name: string; quantity: number; amount: number | null }>;
  assistanceDescription?: string;
  orderType?: string;
  createdAt: string;
  isCanceled: boolean;
  isCompleted: boolean;
  isActive: boolean;
}

export const SUPPORT_ORDER_QUERY_COLUMNS =
  'id, order_number, status, total_amount, payment_method, delivery_status, scheduled_date, delivery_finished_at, items, created_at';

export const SUPPORT_ORDERS_LOAD_ERROR = 'Não foi possível carregar os pedidos deste cliente. Tente novamente.';
export const SUPPORT_ORDERS_PERMISSION_ERROR = 'Você não tem permissão para consultar os pedidos deste cliente.';

/**
 * Mapeia e normaliza um registro de pedido para resumo comercial no atendimento
 */
export function mapOrderToSupportSummary(row: any): SupportOrderSummary {
  const statusLower = String(row.status || '').toLowerCase();
  const deliveryStatusLower = String(row.delivery_status || '').toLowerCase();

  const isCanceled =
    statusLower === 'canceled' ||
    statusLower === 'cancelled' ||
    statusLower === 'cancelado' ||
    deliveryStatusLower === 'canceled' ||
    deliveryStatusLower === 'cancelled' ||
    deliveryStatusLower === 'cancelado';
  const isCompleted =
    statusLower === 'completed' ||
    statusLower === 'concluído' ||
    statusLower === 'concluido' ||
    statusLower === 'delivered' ||
    deliveryStatusLower === 'delivered' ||
    deliveryStatusLower === 'entregue' ||
    deliveryStatusLower === 'completed' ||
    deliveryStatusLower === 'concluído' ||
    deliveryStatusLower === 'concluido';
  const isActive = !isCanceled && !isCompleted;

  let itemsCount = 0;
  const itemNames: string[] = [];

  if (Array.isArray(row.items)) {
    itemsCount = row.items.length;
    for (const it of row.items.slice(0, 3)) {
      const name = it.name || it.product_name || it.description || 'Item';
      const qty = it.quantity || it.qty || 1;
      itemNames.push(`${qty}x ${name}`);
    }
  }

  const itemsPreview =
    itemNames.length > 0
      ? `${itemNames.join(', ')}${itemsCount > 3 ? ` (+${itemsCount - 3} mais)` : ''}`
      : 'Nenhum item discriminado';

  return {
    id: String(row.id),
    orderNumber: row.order_number || String(row.id).slice(0, 8),
    status: row.status || 'Ativo',
    totalAmount: Number(row.total_amount) || 0,
    paymentMethod: row.payment_method,
    deliveryStatus: row.delivery_status,
    scheduledDate: row.scheduled_date,
    scheduledStartTime: row.scheduled_start_time,
    scheduledEndTime: row.scheduled_end_time,
    deliveryMethod: row.delivery_method,
    deliveryFinishedAt: row.delivery_finished_at,
    itemsCount,
    itemsPreview,
    createdAt: row.created_at || new Date().toISOString(),
    isCanceled,
    isCompleted,
    isActive,
  };
}

function mapOrderToSupportRecordSummary(row: any): SupportOrderSummary {
  const summary = mapOrderToSupportSummary({ ...row, items: row.items?.length ? row.items : row.assistance_items });
  const sourceItems = Array.isArray(row.items) && row.items.length
    ? row.items
    : Array.isArray(row.assistance_items) ? row.assistance_items : [];
  return {
    ...summary,
    lineItems: sourceItems.map((item: any) => ({
      name: String(item.name || item.product_name || item.description || item.productName || 'Item'),
      quantity: Math.max(1, Number(item.quantity || item.qty || 1) || 1),
      amount: Number.isFinite(Number(item.total || item.totalPrice || item.subtotal))
        ? Number(item.total || item.totalPrice || item.subtotal)
        : null,
    })),
    assistanceDescription: typeof row.assistance_description === 'string' ? row.assistance_description : undefined,
    orderType: String(row.order_type || row.order_data?.orderType || row.order_data?.order_type || 'sale'),
    assemblyAppointments: Array.isArray(row.assembly_records)
      ? row.assembly_records.map((appointment: any) => ({
        item: String(appointment.item || 'Montagem'),
        date: String(appointment.date || ''),
        time: appointment.time ? String(appointment.time) : null,
        type: String(appointment.type || 'delivery'),
        status: String(appointment.status || 'pending'),
      }))
      : [],
  };
}

/**
 * Consulta pedidos de venda vinculados a um cliente no ERP.
 * Respeita a regra de Egress: carrega apenas colunas necessárias com limite de 20 registros.
 */
export async function getCustomerOrders(
  supabase: SupabaseClient,
  customerId: string
): Promise<SupportOrderSummary[]> {
  if (!customerId) return [];

  let response;
  try {
    response = await withTimeout<any>(supabase.rpc('customer_support_list_customer_orders', {
      p_customer_id: customerId,
    }), 15_000, null, 'central:pedidos-cliente');
  } catch {
    throw new Error(SUPPORT_ORDERS_LOAD_ERROR);
  }
  if (response?.error?.code === '42501') {
    throw new Error(SUPPORT_ORDERS_PERMISSION_ERROR);
  }
  if (response?.error || !Array.isArray(response?.data)) {
    throw new Error(SUPPORT_ORDERS_LOAD_ERROR);
  }

  return response.data.map(mapOrderToSupportSummary);
}

/** Consult customer sale, assistance or return records using permission-checked server paging. */
export async function getCustomerOrderRecordsPage(
  supabase: SupabaseClient,
  customerId: string,
  orderGroup: SupportCustomerOrderGroup,
  options: { page?: number; pageSize?: number; search?: string; status?: string } = {}
): Promise<SupportCustomerOrderPage> {
  if (!customerId) return { records: [], page: 1, pageSize: 20, total: 0 };
  const filters = supportCustomerRecordFiltersSchema.safeParse({
    search: options.search || '',
    status: options.status || '',
  });
  if (!filters.success) throw new Error(filters.error.issues[0]?.message || 'Filtro inválido.');

  const page = Math.max(1, Math.trunc(options.page || 1));
  const pageSize = Math.min(50, Math.max(1, Math.trunc(options.pageSize || 20)));
  let response;
  try {
    response = await withTimeout<any>(supabase.rpc('customer_support_list_customer_records_page', {
      p_customer_id: customerId,
      p_order_group: orderGroup,
      p_page: page,
      p_page_size: pageSize,
      p_status: filters.data.status || null,
      p_search: filters.data.search || null,
    }), 15_000, null, 'central:historico-comercial-cliente');
  } catch {
    throw new Error(SUPPORT_ORDERS_LOAD_ERROR);
  }
  if (response?.error?.code === '42501') throw new Error(SUPPORT_ORDERS_PERMISSION_ERROR);
  if (response?.error || !response?.data || !Array.isArray(response.data.records)) {
    throw new Error(SUPPORT_ORDERS_LOAD_ERROR);
  }

  return {
    records: response.data.records.map(mapOrderToSupportRecordSummary),
    page: Number(response.data.page) || page,
    pageSize: Number(response.data.page_size) || pageSize,
    total: Math.max(0, Number(response.data.total) || 0),
  };
}

/**
 * Formata moeda BRL
 */
export function formatBRL(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

/**
 * Formata data legível
 */
export function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return '-';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(date);
  } catch {
    return dateString;
  }
}
