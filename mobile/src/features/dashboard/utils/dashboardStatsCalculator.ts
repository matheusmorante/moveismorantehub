import { isCancelledOrder, isDateInPeriod } from '../../../utils/orderUtils';
import { isAssemblyOutsideType, isAssemblyInternalType } from '../../../utils/aiSummaryHelper';

export interface DashboardStats {
  deliveriesCount: number;
  assembliesInternalCount: number;
  assembliesOutsideCount: number;
  assistancesCount: number;
  returnsCount: number;
}

export const calculateDashboardStats = (rawOrders: any[], settingsData: any, periodId: string): DashboardStats => {
  if (!rawOrders || rawOrders.length === 0) {
    return { deliveriesCount: 0, assembliesInternalCount: 0, assembliesOutsideCount: 0, assistancesCount: 0, returnsCount: 0 };
  }

  const allHandlingOptions = [
    ...(settingsData?.deliveryHandlingOptions || []),
    ...(settingsData?.pickupHandlingOptions || [])
  ];

  const activeOrders = rawOrders.filter((o: any) => {
    const oData = o.order_data || {};
    return !oData.deleted && !o.deleted;
  });

  let dCount = 0;
  let aIntCount = 0;
  let aOutCount = 0;
  let astCount = 0;
  let retCount = 0;

  activeOrders.forEach((o: any) => {
    const oData = o.order_data || {};
    const orderStatus = (o.status || oData.status || '').toLowerCase();
    if (orderStatus === 'draft' || orderStatus === 'rascunho' || isCancelledOrder(o)) return;

    const shipping = oData.shipping || {};
    const sched = shipping.scheduling || oData.schedule || oData.scheduling || o.schedule || {};
    const rawSchedDate = sched.date || sched.startDate || o.scheduled_date || o.date || '';

    const isInPeriod = isDateInPeriod(rawSchedDate || o.created_at, periodId);
    if (!isInPeriod) return;

    const items = oData.items || o.items || [];
    const orderType = (oData.orderType || o.order_type || '').toLowerCase();

    if (orderType === 'assistance') astCount++;
    if (orderType === 'return') retCount++;

    if (rawSchedDate || sched.date || orderType === 'delivery' || (!orderType || orderType === 'sale' || orderType === 'venda')) {
      dCount++;
    }

    const orderHandling = (
      oData.handlingType ||
      oData.handling ||
      oData.deliveryType ||
      shipping.handlingType ||
      shipping.handling ||
      o.handling ||
      o.handlingType ||
      ''
    ).toString();

    if (Array.isArray(items) && items.length > 0) {
      items.forEach((item: any) => {
        const itemHandling = (
          item.handlingType ||
          item.handling ||
          item.handling_type ||
          item.deliveryType ||
          ''
        ).toString();

        const qty = Number(item.quantity || item.qty || 1);
        const effectiveHandling = itemHandling || orderHandling;

        if (isAssemblyOutsideType(effectiveHandling, allHandlingOptions)) {
          aOutCount += qty;
        } else if (isAssemblyInternalType(effectiveHandling, allHandlingOptions)) {
          aIntCount += qty;
        }
      });
    }
  });

  return {
    deliveriesCount: dCount,
    assembliesInternalCount: aIntCount,
    assembliesOutsideCount: aOutCount,
    assistancesCount: astCount,
    returnsCount: retCount,
  };
};
