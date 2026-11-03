import { describe, expect, it } from 'vitest';
import type { DashboardStats } from './useDashboardData';
import { parseDashboardSalesRollup, selectDashboardSalesStats } from './dashboardSalesRollup';

const stats = (totalSales: number, saleCount: number, paidTrafficSalesValue: number): DashboardStats => ({
  totalSales, saleCount, paidTrafficSalesValue, totalOrdersCount: saleCount,
  totalCmv: 30, totalProfit: totalSales - 30, grossMargin: totalSales > 0 ? (totalSales - 30) / totalSales * 100 : 0,
  cmvPartial: false, itemsWithoutCost: 0, avgTicket: saleCount ? totalSales / saleCount : 0,
  pendingOrders: 0, activeSchedules: 0, totalKmDriven: 0,
});

describe('leitura gradual do consolidado de vendas', () => {
  it('usa o consolidado pronto como fonte dos indicadores financeiros', () => {
    const current = stats(100, 2, 40);
    const previous = stats(80, 1, 20);
    const parsed = parseDashboardSalesRollup({ ready: true, current: { totalSales: '100', saleCount: 2, paidTrafficSalesValue: '40' }, previous });
    const selected = selectDashboardSalesStats(current, previous, parsed);
    expect(selected.usedRollup).toBe(true);
    expect(selected.stats).toMatchObject({ totalSales: 100, saleCount: 2, avgTicket: 50, totalProfit: 70, grossMargin: 70 });
    expect(selected.prevStats.totalSales).toBe(80);
  });

  it('usa o cálculo original somente quando o consolidado está indisponível', () => {
    const current = stats(100, 2, 40);
    const previous = stats(80, 1, 20);
    const result = selectDashboardSalesStats(current, previous, {
      current: { totalSales: 101, saleCount: 2, paidTrafficSalesValue: 40 },
      previous: { totalSales: 80, saleCount: 1, paidTrafficSalesValue: 20 },
    });
    expect(result.usedRollup).toBe(true);
    expect(result.stats.totalSales).toBe(101);
    const fallback = selectDashboardSalesStats(current, previous, null);
    expect(fallback.usedRollup).toBe(false);
    expect(fallback.stats).toBe(current);
    expect(fallback.prevStats).toBe(previous);
  });

  it('rejeita respostas incompletas, inválidas ou ainda não ativadas', () => {
    expect(parseDashboardSalesRollup({ ready: false })).toBeNull();
    expect(parseDashboardSalesRollup({ ready: true, current: { totalSales: null }, previous: {} })).toBeNull();
    expect(parseDashboardSalesRollup({ ready: true, current: { totalSales: 1, saleCount: -1, paidTrafficSalesValue: 0 }, previous: {} })).toBeNull();
  });
});
