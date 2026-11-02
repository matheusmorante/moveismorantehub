export const normalizeSavedReportResults = (reportData: any) => {
  const monthCount = reportData.monthCount || 1;
  let avgProfitPerItem = reportData.avgProfitPerItem || 0;
  let avgTurnoverPerItem = reportData.avgTurnoverPerItem || 0;

  // Relatórios antigos podem não ter persistido as médias usadas pela matriz.
  if (avgProfitPerItem === 0 || avgTurnoverPerItem === 0) {
    const tempResults = reportData.results || [];
    if (tempResults.length > 0) {
      const sumP = tempResults.reduce(
        (acc: number, curr: any) => acc + (curr.monthlyProfit ?? curr.totalProfit / monthCount),
        0
      );
      const sumT = tempResults.reduce(
        (acc: number, curr: any) =>
          acc + (curr.monthlyTurnover ?? curr.totalQuantity / monthCount),
        0
      );
      avgProfitPerItem = sumP / tempResults.length;
      avgTurnoverPerItem = sumT / tempResults.length;
    }
  }

  const results = reportData.results.map((result: any) => {
    const monthlyProfit = result.monthlyProfit ?? result.totalProfit / monthCount;
    const monthlyTurnover = result.monthlyTurnover ?? result.totalQuantity / monthCount;

    let quadrant: 1 | 2 | 3 | 4 = 4;
    if (monthlyTurnover >= avgTurnoverPerItem && monthlyProfit >= avgProfitPerItem) quadrant = 1;
    else if (monthlyTurnover < avgTurnoverPerItem && monthlyProfit >= avgProfitPerItem) quadrant = 2;
    else if (monthlyTurnover >= avgTurnoverPerItem && monthlyProfit < avgProfitPerItem) quadrant = 3;

    return {
      ...result,
      monthlyProfit,
      monthlyTurnover,
      quadrant,
    };
  });

  return { monthCount, avgProfitPerItem, avgTurnoverPerItem, results };
};

export const normalizeSavedReportProducts = (
  allProducts: any,
  resultsWithMonthly: any[],
  monthCount: any,
  avgProfitPerItem: any,
  avgTurnoverPerItem: any
) => {
  let baseAllProducts = allProducts || [];

  if (
    baseAllProducts.length === 0 ||
    (baseAllProducts.length > 0 && typeof baseAllProducts[0] === 'string')
  ) {
    baseAllProducts = resultsWithMonthly.map((result: any) => ({
      product: result.product,
      qty: result.totalQuantity,
      profit: result.totalProfit,
      supplier: result.supplier,
    }));
  }

  return baseAllProducts.map((product: any) => {
    const monthlyProfit = (product.profit || 0) / monthCount;
    const monthlyTurnover = (product.qty || 0) / monthCount;
    let quadrant: 1 | 2 | 3 | 4 = 4;

    if (monthlyTurnover >= avgTurnoverPerItem && monthlyProfit >= avgProfitPerItem) quadrant = 1;
    else if (monthlyTurnover < avgTurnoverPerItem && monthlyProfit >= avgProfitPerItem) quadrant = 2;
    else if (monthlyTurnover >= avgTurnoverPerItem && monthlyProfit < avgProfitPerItem) quadrant = 3;

    return { ...product, quadrant };
  });
};
