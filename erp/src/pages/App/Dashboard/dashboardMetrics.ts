import { z } from 'zod';
import { supabase } from '@/pages/utils/supabaseConfig';
import { withTimeout } from '../../../../../shared-utils/withTimeout';

const amount = z.number().finite();
const count = amount.int().nonnegative();
const statsSchema = z.object({
  totalSales: amount, saleCount: count, totalOrdersCount: count,
  totalProfit: amount, grossMargin: amount, totalCmv: amount,
  cmvPartial: z.boolean(), itemsWithoutCost: count, avgTicket: amount,
  pendingOrders: count, activeSchedules: count, totalKmDriven: amount,
  paidTrafficSalesValue: amount,
});
const productSchema = z.object({
  productId: z.string(), variationId: z.string().nullish().transform((value) => value || undefined),
  name: z.string(), quantity: amount, revenue: amount, profit: amount, margin: amount,
});
export const dashboardMetricsSchema = z.object({
  current: statsSchema,
  previous: statsSchema,
  series: z.array(z.object({ bucket: z.string(), valor: amount, lucro: amount, orders: count })),
  products: z.object({
    topByQuantity: z.array(productSchema).max(5),
    topByRevenue: z.array(productSchema).max(5),
    topByProfit: z.array(productSchema).max(5),
  }),
  operational: z.object({
    openOrders: count, scheduledOrders: count, deliveriesToday: count,
    lateDeliveries: count, pendingAssemblies: count,
  }),
  logistics: z.object({ fulfilled: count, pending: count, late: count, totalKm: amount }),
});

export type DashboardMetrics = z.infer<typeof dashboardMetricsSchema>;
export type DashboardStats = DashboardMetrics['current'];
export type DashboardBucket = 'hour' | 'day' | 'month';
export interface DashboardMetricsRange {
  currentStart: Date; currentEnd: Date; previousStart: Date; previousEnd: Date;
  bucket: DashboardBucket; timezone: string;
}

const EMPTY_STATS: DashboardStats = {
  totalSales: 0, saleCount: 0, totalOrdersCount: 0, totalProfit: 0, grossMargin: 0,
  totalCmv: 0, cmvPartial: false, itemsWithoutCost: 0, avgTicket: 0,
  pendingOrders: 0, activeSchedules: 0, totalKmDriven: 0, paidTrafficSalesValue: 0,
};
export const EMPTY_DASHBOARD_METRICS: DashboardMetrics = {
  current: EMPTY_STATS, previous: EMPTY_STATS, series: [],
  products: { topByQuantity: [], topByRevenue: [], topByProfit: [] },
  operational: { openOrders: 0, scheduledOrders: 0, deliveriesToday: 0, lateDeliveries: 0, pendingAssemblies: 0 },
  logistics: { fulfilled: 0, pending: 0, late: 0, totalKm: 0 },
};

export async function fetchDashboardMetrics(range: DashboardMetricsRange, signal: AbortSignal): Promise<DashboardMetrics> {
  const request = supabase.rpc('get_dashboard_metrics', {
    p_current_start: range.currentStart.toISOString(), p_current_end: range.currentEnd.toISOString(),
    p_previous_start: range.previousStart.toISOString(), p_previous_end: range.previousEnd.toISOString(),
    p_bucket: range.bucket, p_timezone: range.timezone,
  }).abortSignal(signal);
  const result = await withTimeout(request, 15_000, null, 'Indicadores do Dashboard');
  if (!result) throw new Error('O carregamento dos indicadores do Dashboard excedeu o tempo limite.');
  if (result.error) throw result.error;
  return dashboardMetricsSchema.parse(result.data);
}
