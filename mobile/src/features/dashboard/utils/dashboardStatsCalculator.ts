import { isCancelledOrder, isDateInPeriod } from '../../../utils/orderUtils';
import { isAssemblyOutsideType, isAssemblyInternalType } from '../../../utils/aiSummaryHelper';

export interface DashboardStats {
  deliveriesCount: number;
  assembliesInternalCount: number;
  assembliesOutsideCount: number;
  assistancesCount: number;
  returnsCount: number;
  salesOrdersCount: number;
}

const normalize = (value: unknown) => String(value ?? '')
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();

const record = (value: unknown): Record<string, any> =>
  value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, any> : {};

const getOrderType = (order: Record<string, any>, data: Record<string, any>) =>
  normalize(data.orderType || data.order_type || order.order_type || order.orderType || 'sale');

const getOrderStatus = (order: Record<string, any>, data: Record<string, any>) =>
  normalize(order.status || data.status || order.order_status || data.order_status);

const isDraft = (status: string) => status === 'draft' || status === 'rascunho';

const isDeleted = (order: Record<string, any>, data: Record<string, any>) =>
  order.deleted === true || data.deleted === true || Boolean(order.deletedAt || order.deleted_at || data.deletedAt || data.deleted_at);

const getScheduleDate = (order: Record<string, any>, data: Record<string, any>) => {
  const shipping = record(data.shipping);
  const schedule = record(shipping.scheduling || data.schedule || data.scheduling || order.schedule);
  return schedule.date || schedule.startDate || order.scheduled_date || data.scheduledDate || '';
};

const getOrderDate = (order: Record<string, any>, data: Record<string, any>) =>
  data.date || order.date || data.createdAt || data.created_at || order.created_at || '';

const matchesPeriod = (date: unknown, period: string) =>
  typeof date === 'string' && isDateInPeriod(date, period);

export const calculateDashboardStats = (rawOrders: any[], settingsData: any, periodId: string): DashboardStats => {
  const zero = { deliveriesCount: 0, assembliesInternalCount: 0, assembliesOutsideCount: 0, assistancesCount: 0, returnsCount: 0, salesOrdersCount: 0 };
  if (!Array.isArray(rawOrders) || rawOrders.length === 0) return zero;

  const settings = record(settingsData);
  const allHandlingOptions = [
    ...(Array.isArray(settings.deliveryHandlingOptions) ? settings.deliveryHandlingOptions : []),
    ...(Array.isArray(settings.pickupHandlingOptions) ? settings.pickupHandlingOptions : []),
  ];

  const stats = { ...zero };
  rawOrders.forEach((rawOrder: any) => {
    const order = record(rawOrder);
    const data = record(order.order_data);
    const status = getOrderStatus(order, data);
    if (isDeleted(order, data) || isDraft(status) || isCancelledOrder({ ...order, status, order_data: data })) return;

    const orderType = getOrderType(order, data);
    const scheduleDate = getScheduleDate(order, data);
    const orderDate = getOrderDate(order, data);
    const isSale = orderType === 'sale' || orderType === 'venda';
    const isAssistance = orderType === 'assistance' || orderType === 'assistencia';
    const isReturn = orderType === 'return' || orderType === 'devolucao';

    // Deliveries and pending assemblies represent upcoming work, not completed orders.
    const isScheduled = status === 'scheduled' || status === 'agendado' || status === 'agendada';
    const shipping = record(data.shipping);
    const deliveryMethod = normalize(shipping.deliveryMethod || data.deliveryMethod || order.delivery_method);
    const deliveryStatus = normalize(data.deliveryStatus || order.delivery_status);
    const deliveryFinished = Boolean(data.deliveryFinishedAt || order.delivery_finished_at);
    const hasDeliverySchedule = matchesPeriod(scheduleDate, periodId);
    const isPickup = deliveryMethod === 'pickup' || deliveryMethod === 'retirada';

    if (isScheduled && hasDeliverySchedule && !isPickup && !deliveryFinished && deliveryStatus !== 'completed' &&
      (isSale || orderType === 'delivery' || orderType === 'entrega')) {
      stats.deliveriesCount++;
    }

    if (isAssistance && matchesPeriod(scheduleDate || orderDate, periodId)) stats.assistancesCount++;
    if (isReturn && matchesPeriod(orderDate, periodId)) stats.returnsCount++;
    if (isSale && matchesPeriod(orderDate, periodId)) stats.salesOrdersCount++;

    if (isScheduled && matchesPeriod(scheduleDate || orderDate, periodId)) {
      const items = Array.isArray(data.items) ? data.items : Array.isArray(order.items) ? order.items : [];
      const orderHandling = String(data.handlingType || data.handling || data.deliveryType || shipping.handlingType || shipping.handling || order.handling || order.handlingType || '');
      for (const item of items) {
        const itemData = record(item);
        const itemHandling = String(itemData.handlingType || itemData.handling || itemData.handling_type || itemData.deliveryType || '');
        const rawQuantity = Number(itemData.quantity ?? itemData.qty ?? 1);
        const quantity = Number.isFinite(rawQuantity) && rawQuantity > 0 ? rawQuantity : 0;
        const handling = itemHandling || orderHandling;
        if (isAssemblyOutsideType(handling, allHandlingOptions)) stats.assembliesOutsideCount += quantity;
        else if (isAssemblyInternalType(handling, allHandlingOptions)) stats.assembliesInternalCount += quantity;
      }
    }
  });

  return stats;
};
