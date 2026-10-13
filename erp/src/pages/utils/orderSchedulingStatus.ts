import Shipping from '../types/Shipping.type';

export const formatOrderSchedulingText = (shipping: any, order?: any): string => {
  const sched = shipping?.scheduling || {};
  if (sched.pendingScheduling && !sched.immediatePickup) return 'Agendamento: Pendente';

  const formatDateStr = (dStr: string) => {
    if (!dStr) return '';
    const clean = dStr.split('T')[0];
    const parts = clean.split('-');
    if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
    return clean;
  };

  const startDate = sched.date || order?.scheduled_date || order?.order_data?.scheduledDate;
  const endDate = sched.endDate;

  let dateLabel = '';
  if (sched.dateType === 'range' && endDate && startDate) {
    dateLabel = `${formatDateStr(startDate)} até ${formatDateStr(endDate)}`;
  } else if (startDate) {
    dateLabel = formatDateStr(startDate);
  }

  let timeLabel = '';
  if (sched.type === 'range' && sched.startTime && sched.endTime) {
    timeLabel = `${sched.startTime} até ${sched.endTime}`;
  } else if (sched.startTime) {
    timeLabel = sched.startTime;
  } else if (sched.time) {
    timeLabel = sched.time;
  }

  if (dateLabel && timeLabel) return `Agendado: ${dateLabel} (${timeLabel})`;
  if (dateLabel) return `Agendado: ${dateLabel}`;
  return '';
};

export const resolveCompletedOrderStatus = (order: {
  shipping?: Shipping;
  orderType?: string;
  status?: string;
}, now = new Date()): 'draft' | 'quoted' | 'scheduled' | 'fulfilled' => {
  if (order.orderType === 'budget') return 'quoted';

  const shipping = order.shipping;
  const isPickup = shipping?.deliveryMethod === 'pickup';

  if (isPickup) {
    const scheduling = shipping?.scheduling;
    if (scheduling?.immediatePickup) {
      return 'fulfilled';
    }
    if (scheduling?.pendingScheduling) {
      return 'scheduled';
    }

    const schedDateStr = (
      (scheduling?.dateType === 'range' || scheduling?.type === 'range') && scheduling.endDate
        ? scheduling.endDate
        : scheduling?.date
    )?.trim();
    if (schedDateStr) {
      const cleanDate = schedDateStr.split('T')[0];
      const isBrazilianDate = cleanDate.includes('/');
      const parts = cleanDate.split(isBrazilianDate ? '/' : '-');
      const year = Number(isBrazilianDate ? parts[2] : parts[0]);
      const month = Number(parts[1]);
      const day = Number(isBrazilianDate ? parts[0] : parts[2]);
      const scheduledDate = new Date(year, month - 1, day);
      const isValidDate =
        Number.isInteger(day) && Number.isInteger(month) && Number.isInteger(year) &&
        scheduledDate.getFullYear() === year &&
        scheduledDate.getMonth() === month - 1 &&
        scheduledDate.getDate() === day;
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      if (isValidDate && scheduledDate < today) {
        return 'fulfilled';
      }
      return 'scheduled';
    }

    return 'fulfilled';
  }

  return 'scheduled';
};

export const shouldAutoFulfillScheduledSaleOnEdit = (
  currentOrder: { status?: string; orderType?: string },
  updatedOrder: { shipping?: Shipping; orderType?: string }
): boolean => {
  const orderType = currentOrder.orderType || updatedOrder.orderType || 'sale';
  return (
    currentOrder.status === 'scheduled' &&
    ['sale', 'showroom'].includes(orderType) &&
    resolveCompletedOrderStatus({ ...updatedOrder, orderType }) === 'fulfilled'
  );
};
