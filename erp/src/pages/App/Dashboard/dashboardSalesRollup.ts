import type { DashboardStats } from './useDashboardData';

export interface DashboardSalesHeader {
  totalSales: number;
  saleCount: number;
  paidTrafficSalesValue: number;
}

export interface DashboardSalesRollup {
  current: DashboardSalesHeader;
  previous: DashboardSalesHeader;
}

function parseHeader(value: unknown): DashboardSalesHeader | null {
  if (!value || typeof value !== 'object') return null;
  const row = value as Record<string, unknown>;
  if ([row.totalSales, row.saleCount, row.paidTrafficSalesValue].some((item) => item == null || item === '')) return null;
  const totalSales = Number(row.totalSales);
  const saleCount = Number(row.saleCount);
  const paidTrafficSalesValue = Number(row.paidTrafficSalesValue);
  if (!Number.isFinite(totalSales) || !Number.isSafeInteger(saleCount) || saleCount < 0 || !Number.isFinite(paidTrafficSalesValue)) return null;
  return { totalSales, saleCount, paidTrafficSalesValue };
}

export function parseDashboardSalesRollup(value: unknown): DashboardSalesRollup | null {
  if (!value || typeof value !== 'object' || (value as { ready?: unknown }).ready !== true) return null;
  const row = value as Record<string, unknown>;
  const current = parseHeader(row.current);
  const previous = parseHeader(row.previous);
  return current && previous ? { current, previous } : null;
}

export function selectDashboardSalesStats(
  direct: DashboardStats,
  previous: DashboardStats,
  rollup: DashboardSalesRollup | null
) {
  if (!rollup) return { stats: direct, prevStats: previous, usedRollup: false };

  const applyHeader = (source: DashboardStats, header: DashboardSalesHeader): DashboardStats => {
    const totalProfit = header.totalSales - source.totalCmv;
    return { ...source, ...header, avgTicket: header.saleCount > 0 ? header.totalSales / header.saleCount : 0,
      totalProfit, grossMargin: header.totalSales > 0 ? totalProfit / header.totalSales * 100 : 0 };
  };
  return {
    stats: applyHeader(direct, rollup.current),
    prevStats: applyHeader(previous, rollup.previous),
    usedRollup: true,
  };
}
