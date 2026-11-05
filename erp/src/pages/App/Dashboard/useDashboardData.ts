import { useMemo } from 'react';
import Order from '../../types/order.type';
import {
  subDays,
  subMonths,
} from 'date-fns';
import {
  dashboardRevenueFactor,
  getDefinitiveOrderValue,
  isDashboardSaleOrder,
} from './dashboardRevenue';
import { useDashboardQueries } from './hooks/useDashboardQueries';
import { EMPTY_DASHBOARD_METRICS, type DashboardMetrics } from './dashboardMetrics';
import { buildDashboardIntervals } from './dashboardDateRanges';
import { parseDashboardOrderDate } from './dashboardOrderDate';

export type Period =
  | 'custom'
  | 'today'
  | 'yesterday'
  | 'month'
  | 'last_30_days'
  | 'specific_month'
  | 'last_semester'
  | 'year';

export interface SalesHistory {
  date: string;
  valor: number;
  lucro: number;
  orders: number;
}

export type { DashboardStats } from './dashboardMetrics';

const MONTHS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

/** Calcula o CMV real de um pedido usando unitCost dos itens (CMPM histórico) */
export const calcOrderCmv = (
  order: Order
): { cmv: number; partial: boolean; itemsWithout: number } => {
  let cmv = 0;
  let itemsWithout = 0;
  for (const item of order.items || []) {
    if (item.isTemporaryProduct || !item.productId) continue;
    const qty = item.quantity || 0;
    const unitCost = item.unitCost ?? item.costPrice ?? null;
    if (unitCost === null || unitCost === undefined) {
      itemsWithout++;
    } else {
      cmv += qty * unitCost;
    }
  }
  return { cmv, partial: itemsWithout > 0, itemsWithout };
};

export const parsePTBRDatePublic = parseDashboardOrderDate;

export const buildDashboardSalesChart = (
  filteredOrders: Order[],
  current: { start: Date; end: Date },
  period: Period,
  series: DashboardMetrics['series'] = []
) => {
  const isMonthlyChart = period === 'year' || period === 'last_semester';
  const isHourlyChart = period === 'today' || period === 'yesterday';
  const bucketKey = (date: Date) => {
    const parts = [date.getFullYear(), date.getMonth()];
    if (!isMonthlyChart) parts.push(date.getDate());
    if (isHourlyChart) parts.push(date.getHours());
    return parts.join(':');
  };
  const buckets = new Map<string, { valor: number; lucro: number; orders: number }>();

  for (const order of filteredOrders) {
    const date = parseDashboardOrderDate(order.date);
    const factor = dashboardRevenueFactor(order);
    if (!date || factor === 0) continue;
    const key = bucketKey(date);
    const bucket = buckets.get(key) ?? { valor: 0, lucro: 0, orders: 0 };
    const value = getDefinitiveOrderValue(order);
    bucket.valor += factor * value;
    bucket.lucro += factor * (value - calcOrderCmv(order).cmv);
    if (isDashboardSaleOrder(order)) bucket.orders += 1;
    buckets.set(key, bucket);
  }

  for (const { bucket, valor, lucro, orders } of series) {
    buckets.set(bucketKey(new Date(bucket)), { valor, lucro, orders });
  }

  const dateRange: Date[] = [];
  let cursor = new Date(current.start);
  if (isHourlyChart) {
    for (let hour = 0; hour < 24; hour++) {
      const date = new Date(current.start);
      date.setHours(hour, 0, 0, 0);
      dateRange.push(date);
    }
  } else {
    while (cursor <= current.end) {
      dateRange.push(new Date(cursor));
      cursor = isMonthlyChart ? subMonths(cursor, -1) : subDays(cursor, -1);
    }
  }

  return dateRange.map((date) => {
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear().toString().slice(-2);
    const name = isHourlyChart
      ? `${date.getHours()}h`
      : isMonthlyChart
        ? `${MONTHS[date.getMonth()]}/${year}`
        : period === 'custom'
          ? `${day}/${month}/${year}`
          : `${day}/${month}`;
    return { name, ...(buckets.get(bucketKey(date)) ?? { valor: 0, lucro: 0, orders: 0 }) };
  });
};

export const useDashboardData = (
  period: Period,
  customStartDate?: string,
  customEndDate?: string,
  specificMonth?: string,
) => {
  const intervals = useMemo(() => {
    const now = new Date();
    return buildDashboardIntervals(period, now, customStartDate, customEndDate, specificMonth);
  }, [period, customStartDate, customEndDate, specificMonth]);

  const { metrics: snapshot, recentOrders, geoMapOrders, loading, ordersQueryError, retryOrderQueries } = useDashboardQueries({
    previousStart: intervals.prev.start, previousEnd: intervals.prev.end,
    currentStart: intervals.current.start, currentEnd: intervals.current.end,
    bucket: period === 'today' || period === 'yesterday' ? 'hour'
      : period === 'year' || period === 'last_semester' ? 'month' : 'day',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  });
  const metrics = snapshot ?? EMPTY_DASHBOARD_METRICS;
  const salesOverTime = useMemo(
    () => buildDashboardSalesChart([], intervals.current, period, metrics.series),
    [metrics.series, intervals.current, period]
  );

  return {
    loading, ordersQueryError, retryOrderQueries,
    salesSummaryAvailable: snapshot !== undefined,
    stats: metrics.current, prevStats: metrics.previous, salesOverTime,
    operational: metrics.operational, productRankings: metrics.products, logistics: metrics.logistics,
    intervals, recentOrders, geoMapOrders,
  };
};
