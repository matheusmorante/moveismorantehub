import type { SupportOrderSummary } from './ordersTypes.js';

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
    orderType: String(
      row.order_type || row.order_data?.orderType || row.order_data?.order_type || 'sale'
    ),
    createdAt: row.created_at || new Date().toISOString(),
    isCanceled,
    isCompleted,
    isActive,
  };
}

export function mapOrderToSupportRecordSummary(row: any): SupportOrderSummary {
  const summary = mapOrderToSupportSummary({
    ...row,
    items: row.items?.length ? row.items : row.assistance_items,
  });
  const sourceItems =
    Array.isArray(row.items) && row.items.length
      ? row.items
      : Array.isArray(row.assistance_items)
        ? row.assistance_items
        : [];
  return {
    ...summary,
    customerName: row.customer_name || row.customerName || null,
    lineItems: sourceItems.map((item: any) => ({
      name: String(
        item.name || item.product_name || item.description || item.productName || 'Item'
      ),
      quantity: Math.max(1, Number(item.quantity || item.qty || 1) || 1),
      amount: Number.isFinite(Number(item.total || item.totalPrice || item.subtotal))
        ? Number(item.total || item.totalPrice || item.subtotal)
        : null,
    })),
    assistanceDescription:
      typeof row.assistance_description === 'string' ? row.assistance_description : undefined,
    orderType: String(
      row.order_type || row.order_data?.orderType || row.order_data?.order_type || 'sale'
    ),
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
