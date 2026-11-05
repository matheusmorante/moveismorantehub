import type { ABCResult } from '../utils/salesReportCalculations';

export const deriveReportScatterData = (results: readonly ABCResult[], monthCount: number) =>
  results.map((result) => ({
    x: result.monthlyTurnover || result.totalQuantity / (monthCount || 1),
    y: result.monthlyProfit,
    name: result.product,
    quadrant: result.quadrant,
  }));

export const deriveReportAbcChartData = (
  results: readonly ABCResult[],
  abcBasis: 'revenue' | 'profit',
  monthCount: number
) => {
  let accValor = 0;
  const totalItems = results.length;
  const divider = monthCount || 1;

  return results.map((item, index) => {
    const val = abcBasis === 'revenue' ? item.totalRevenue / divider : item.monthlyProfit;
    accValor += val;

    return {
      name: item.product.substring(0, 20),
      valor: val,
      lucroAcumulado: accValor,
      numeroItens: index + 1,
      percItens: ((index + 1) / (totalItems || 1)) * 100,
      perc: item.accumulatedPercentage,
      class: item.classification,
    };
  });
};
