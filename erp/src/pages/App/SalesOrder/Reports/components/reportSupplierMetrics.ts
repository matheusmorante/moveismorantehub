import type { ABCResult } from '../utils/salesReportCalculations';

export const deriveSupplierAverages = (results: readonly ABCResult[]) => {
  const map: Record<string, { totalProfit: number; totalQty: number; count: number }> = {};
  results.forEach((r) => {
    const s = r.supplier || 'N/A';
    if (!map[s]) map[s] = { totalProfit: 0, totalQty: 0, count: 0 };
    map[s].totalProfit += r.monthlyProfit;
    map[s].totalQty += r.monthlyTurnover ?? 0;
    map[s].count += 1;
  });

  const finalMap: Record<string, { avgProfit: number; avgTurnover: number }> = {};
  Object.keys(map).forEach((s) => {
    finalMap[s] = {
      avgProfit: map[s].totalProfit / map[s].count,
      avgTurnover: map[s].totalQty / map[s].count,
    };
  });
  return finalMap;
};

export const deriveSalvadosBenchmark = (rawResults: readonly ABCResult[]): number | null => {
  const items = rawResults.filter((r) => (r.supplier || '').toUpperCase().includes('SALVADOS'));
  if (items.length === 0) return null;
  const totalP = items.reduce((acc, r) => acc + (r.monthlyProfit || 0), 0);
  return totalP / items.length;
};
