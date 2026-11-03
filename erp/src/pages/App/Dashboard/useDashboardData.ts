import { useEffect, useMemo } from 'react';
import Order from '../../types/order.type';
import {
  subDays,
  subMonths,
  isWithinInterval,
} from 'date-fns';
import {
  dashboardRevenueFactor,
  getDashboardRevenueImpact,
  getDefinitiveOrderValue,
  isDashboardSaleOrder,
} from './dashboardRevenue';
import { useDashboardQueries } from './hooks/useDashboardQueries';
import { selectDashboardSalesStats, type DashboardSalesHeader } from './dashboardSalesRollup';
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

export interface DashboardStats {
  totalSales: number;
  saleCount: number;
  totalOrdersCount: number;
  /** Lucro bruto usando unitCost real (CMV por CMPM) */
  totalProfit: number;
  /** Margem bruta em % */
  grossMargin: number;
  /** CMV total do período */
  totalCmv: number;
  /** true se algum item não teve unitCost calculável */
  cmvPartial: boolean;
  /** Qtd de itens sem custo calculável */
  itemsWithoutCost: number;
  avgTicket: number;
  pendingOrders: number;
  activeSchedules: number;
  totalKmDriven: number;
  paidTrafficSalesValue: number;
}

const STATUS_LABELS: Record<string, string> = {
  draft: 'Rascunho',
  scheduled: 'Agendado',
  fulfilled: 'Concluídos',
  cancelled: 'Cancelado',
};
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
  period: Period
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

  const {
    orders, recentOrders, geoMapOrders, salesRollup, loading,
    ordersQueryError, retryOrderQueries,
  } = useDashboardQueries(
    intervals.prev.start,
    intervals.current.end,
    intervals.current.start,
    intervals.prev.end
  );

  const calculateStats = (filteredOrdersList: Order[], salesHeader?: DashboardSalesHeader): DashboardStats => {
    const revenueOrders = filteredOrdersList.filter((o) => dashboardRevenueFactor(o) !== 0);

    const totalSales = salesHeader?.totalSales ?? revenueOrders.reduce(
      (acc, curr) => acc + getDashboardRevenueImpact(curr), 0
    );
    let saleCount = 0;
    let totalKmDriven = 0;
    for (const order of filteredOrdersList) {
      if (!isDashboardSaleOrder(order)) continue;
      saleCount++;
      const rawDist = order?.shipping?.distance;
      totalKmDriven += typeof rawDist === 'number'
        ? rawDist
        : parseFloat(String(rawDist || 0).replace(',', '.')) || 0;
    }
    if (salesHeader) saleCount = salesHeader.saleCount;
    const avgTicket = saleCount > 0 ? totalSales / saleCount : 0;
    const totalOrdersCount = filteredOrdersList.length;

    let totalCmv = 0;
    let cmvPartial = false;
    let itemsWithoutCost = 0;

    for (const order of revenueOrders) {
      const { cmv, partial, itemsWithout } = calcOrderCmv(order);
      totalCmv += cmv * dashboardRevenueFactor(order);
      if (partial) cmvPartial = true;
      itemsWithoutCost += itemsWithout;
    }

    const totalProfit = totalSales - totalCmv;
    const grossMargin = totalSales > 0 ? (totalProfit / totalSales) * 100 : 0;

    const pendingOrders = filteredOrdersList.filter((o) => {
      const status = o?.status;
      return status === 'scheduled' || status === 'draft';
    }).length;

    const activeSchedules = filteredOrdersList.filter(
      (o) => o && o.status === 'scheduled' && o.shipping?.scheduling?.date
    ).length;

    const isPaidTraffic = (o: Order) => {
      const origins = [o?.marketingOrigin, (o?.customerData as any)?.marketingOrigin];
      for (const origin of origins) {
        if (origin && typeof origin === 'string') {
          const mo = origin.toLowerCase().trim();
          if (
            mo === 'paid' ||
            mo.includes('trafego') ||
            mo.includes('tráfego') ||
            mo.includes('ads') ||
            mo.includes('facebook') ||
            mo.includes('instagram') ||
            mo.includes('google')
          )
            return true;
        }
      }
      return false;
    };
    const paidTrafficSalesValue = salesHeader?.paidTrafficSalesValue ?? revenueOrders
      .filter(isPaidTraffic)
      .reduce((acc, curr) => acc + getDashboardRevenueImpact(curr), 0);

    return {
      totalSales,
      saleCount,
      totalOrdersCount,
      totalProfit,
      grossMargin,
      totalCmv,
      cmvPartial,
      itemsWithoutCost,
      avgTicket,
      pendingOrders,
      activeSchedules,
      totalKmDriven,
      paidTrafficSalesValue,
    };
  };

  const { filteredOrders, prevFilteredOrders } = useMemo(() => {
    const active = orders.filter((o) => !o.deleted);
    const { current, prev } = intervals;
    const currentList: Order[] = [];
    const prevList: Order[] = [];
    active.forEach((o) => {
      const oDate = parseDashboardOrderDate(o.date);
      if (!oDate) return;
      if (isWithinInterval(oDate, { start: current.start, end: current.end })) currentList.push(o);
      else if (isWithinInterval(oDate, { start: prev.start, end: prev.end })) prevList.push(o);
    });
    return { filteredOrders: currentList, prevFilteredOrders: prevList };
  }, [orders, intervals]);

  const { stats, prevStats } = useMemo(
    () => selectDashboardSalesStats(
      calculateStats(filteredOrders, salesRollup?.current),
      calculateStats(prevFilteredOrders, salesRollup?.previous),
      salesRollup
    ),
    [filteredOrders, prevFilteredOrders, salesRollup]
  );

  const salesOverTime = useMemo(
    () => buildDashboardSalesChart(filteredOrders, intervals.current, period),
    [filteredOrders, intervals.current, period]
  );

  const statusData = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredOrders.forEach((o) => {
      if (!o) return;
      const rawStatus = o.status || 'draft';
      const label = STATUS_LABELS[rawStatus] || rawStatus;
      counts[label] = (counts[label] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [filteredOrders]);

  const allActiveOrders = useMemo(() => orders.filter((o) => !o.deleted), [orders]);

  return {
    loading,
    ordersQueryError,
    retryOrderQueries,
    salesSummaryAvailable: salesRollup !== null,
    stats,
    prevStats,
    salesOverTime,
    statusData,
    filteredOrders,
    allActiveOrders,
    intervals,
    recentOrders,
    geoMapOrders,
  };
};
