import { useMemo } from 'react';
import { getLocalDateString } from '../../../utils/orderUtils';
import { expandOrderAppointments } from '../../../../../shared-utils/orderAppointmentOccurrences';
import { useScopedOrderSchedule } from './useScopedOrderSchedule';
import {
  buildDeliveryRouteItems, countDeliveryRouteOrders, computeDeliveryRouteStats,
  type DeliveryRouteDateScope, type DeliveryRouteItem,
} from '../domain/deliveryRouteBuilder';

export { checkOutOfOrderRisk } from '../utils/deliveryRouteRisk';
export type { DeliveryRouteDateScope, DeliveryRouteItem };

export function useDeliveryRoute(dateScope: DeliveryRouteDateScope = 'today') {
  const todayStr = getLocalDateString(new Date());
  const schedule = useScopedOrderSchedule('route', { dateScope, startDate: todayStr });
  const orders = useMemo(() => schedule.orders.flatMap((order: any) =>
    expandOrderAppointments(order).map((occurrence: any) => {
      if (occurrence.scheduleAppointment && order.order_data) {
        Object.defineProperty(occurrence, '_sourceOrderData', { value: order.order_data });
      }
      return occurrence;
    })
  ), [schedule.orders]);
  const { showingOffline } = schedule;
  const remoteCounts = schedule.counts;
  const routeItems = useMemo<DeliveryRouteItem[]>(
    () => buildDeliveryRouteItems(orders, dateScope, todayStr), [dateScope, orders, todayStr]
  );
  const dateScopeCounts = useMemo(() => showingOffline ? {
    today: countDeliveryRouteOrders(orders, 'today', todayStr),
    tomorrow: countDeliveryRouteOrders(orders, 'tomorrow', todayStr),
    next_days: countDeliveryRouteOrders(orders, 'next_days', todayStr),
  } : { today: remoteCounts.today || 0, tomorrow: remoteCounts.tomorrow || 0, next_days: remoteCounts.next_days || 0 }, [orders, showingOffline, remoteCounts, todayStr]);
  const currentDelivery = useMemo(() => routeItems.find((item) => item.isCurrent) || null, [routeItems]);
  const nextDelivery = useMemo(() => currentDelivery || routeItems.find((item) => item.isNext) || null, [currentDelivery, routeItems]);
  const stats = useMemo(() => computeDeliveryRouteStats(routeItems), [routeItems]);
  return { ...schedule, orders, routeItems, dateScopeCounts, currentDelivery, nextDelivery, stats };
}
