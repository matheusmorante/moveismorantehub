import { getOrderStatusLabel } from '../../../features/orders/domain/orderStatusPresentation';

export interface OrderStatusConfig {
  statusLabel: string;
  statusBg: string;
  statusBorder: string;
  statusColor: string;
}

/**
 * Mapeia o status do pedido para cores de alto contraste e acessibilidade visual.
 */
export function getOrderDetailsStatusConfig(
  targetOrder: any,
  rawStatus: string,
  isDarkMode: boolean
): OrderStatusConfig {
  const orderData = targetOrder.order_data || targetOrder;
  const statusLabel = getOrderStatusLabel(
    { ...targetOrder, ...orderData, status: rawStatus },
    rawStatus === 'fulfilled'
      ? 'Atendido'
      : rawStatus === 'scheduled'
        ? 'Agendado'
        : rawStatus
  );

  const isCancelled = rawStatus === 'cancelled';
  const isFulfilled = ['fulfilled', 'completed', 'delivered'].includes(rawStatus);
  const isDraft = rawStatus === 'draft';

  const statusBg = isCancelled
    ? (isDarkMode ? '#450a0a' : '#fee2e2')
    : isFulfilled
      ? (isDarkMode ? '#052e16' : '#dcfce7')
      : isDraft
        ? (isDarkMode ? '#1e293b' : '#f1f5f9')
        : (isDarkMode ? '#451a03' : '#fef3c7');

  const statusBorder = isCancelled
    ? (isDarkMode ? '#991b1b' : '#fca5a5')
    : isFulfilled
      ? (isDarkMode ? '#166534' : '#86efac')
      : isDraft
        ? (isDarkMode ? '#334155' : '#cbd5e1')
        : (isDarkMode ? '#92400e' : '#fcd34d');

  const statusColor = isCancelled
    ? '#dc2626'
    : isFulfilled
      ? '#16a34a'
      : isDraft
        ? '#64748b'
        : '#d97706';

  return {
    statusLabel,
    statusBg,
    statusBorder,
    statusColor,
  };
}
