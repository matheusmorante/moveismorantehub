import type { ABCResult } from './salesReportCalculations';

interface SortConfig {
  key: string;
  direction: 'asc' | 'desc';
}

export const sortSalesReportResults = (
  results: ABCResult[],
  sortConfig: SortConfig,
  monthCount: number,
) => {
  const items = [...results];
  if (sortConfig.key) {
    items.sort((a: any, b: any) => {
      let aVal = a[sortConfig.key];
      let bVal = b[sortConfig.key];

      if (sortConfig.key === 'giroMensal') {
        aVal = a.totalQuantity / (monthCount || 1);
        bVal = b.totalQuantity / (monthCount || 1);
      }
      if (sortConfig.key === 'lucroMensal') {
        aVal = a.totalProfit / (monthCount || 1);
        bVal = b.totalProfit / (monthCount || 1);
      }

      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }
  return items;
};
