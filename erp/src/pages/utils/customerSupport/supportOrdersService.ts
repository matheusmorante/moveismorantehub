import { SupabaseClient } from '@supabase/supabase-js';
import { withTimeout } from '../../../../../shared-utils/withTimeout';

export interface SupportOrderSummary {
  id: string;
  orderNumber: string;
  status: string; // 'completed', 'active', 'canceled', etc.
  totalAmount: number;
  paymentMethod?: string | null;
  deliveryStatus?: string | null;
  scheduledDate?: string | null;
  deliveryFinishedAt?: string | null;
  itemsCount: number;
  itemsPreview: string;
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
    statusLower === 'cancelado' ||
    deliveryStatusLower === 'canceled';
  const isCompleted =
    statusLower === 'completed' ||
    statusLower === 'concluído' ||
    statusLower === 'concluido' ||
    statusLower === 'delivered' ||
    deliveryStatusLower === 'delivered' ||
    deliveryStatusLower === 'entregue';
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
    deliveryFinishedAt: row.delivery_finished_at,
    itemsCount,
    itemsPreview,
    createdAt: row.created_at || new Date().toISOString(),
    isCanceled,
    isCompleted,
    isActive,
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
