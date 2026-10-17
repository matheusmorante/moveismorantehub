import { useCallback, useState } from 'react';
import { useZodForm } from '@/hooks/useZodForm';
import { withTimeout } from '../../../../../../shared-utils/withTimeout';
import { blingReportFetchFormSchema, blingReportPageSchema } from '../../../../../../shared-utils/salesReportFormSchemas';
import { useSavedSalesReports } from '../Reports/hooks/useSavedSalesReports';
import { supabase } from '@/pages/utils/supabaseConfig';
const requestError = (message: string, knownFailure = true) => Object.assign(new Error(message), { knownFailure });

export interface ABCResult {
  product: string;
  supplier: string;
  totalQuantity: number;
  totalRevenue: number;
  totalProfit: number;
  avgCost: number;
  accumulatedPercentage: number;
  classification: 'A' | 'B' | 'C';
  monthlyProfit: number;
  monthlyTurnover: number;
  quadrant?: 1 | 2 | 3 | 4;
}

export interface SaleItem {
  date: Date;
  product: string;
  supplier: string;
  quantity: number;
  cost: number;
  salesValue: number;
  profit: number;
}

export const useSalesReport = (contextKey = 'list', readOnly = false) => {
  const [loading, setLoading] = useState(false);
  const [rawResults, setRawResults] = useState<ABCResult[]>([]);
  const [results, setResults] = useState<ABCResult[]>([]);
  const [totalProfit, setTotalProfit] = useState(0);
  const [monthCount, setMonthCount] = useState(0);

  // Matriz de Giro e Lucro
  const [avgProfitPerItem, setAvgProfitPerItem] = useState(0);
  const [avgTurnoverPerItem, setAvgTurnoverPerItem] = useState(0);
  const [allProducts, setAllProducts] = useState<any[]>([]);
  const [reportStartDate, setReportStartDate] = useState<Date | null>(null);
  const [reportEndDate, setReportEndDate] = useState<Date | null>(null);

  const { loading: persistenceLoading, error, sessionKey, savedReports, saveReport, updateReport, deleteReport, listSavedReports, getReport, getProductMappings, begin, invalid, showError, scopeRef, mountedRef } = useSavedSalesReports(
    { results: rawResults, allProducts, totalProfit, monthCount, avgProfitPerItem, avgTurnoverPerItem, reportStartDate, reportEndDate }, contextKey, readOnly,
  );
  const fetchForm = useZodForm(blingReportFetchFormSchema, {});

  const calculateABC = (
    items: SaleItem[],
    basis: 'revenue' | 'profit' = 'revenue',
    returnRaw: boolean = false,
    config?: any,
    productMappings: Record<string, string> = {},
    forceMonthCount?: number
  ) => {
    const productStats: Record<
      string,
      {
        product: string;
        supplier: string;
        qty: number;
        rev: number;
        profit: number;
        totalCost: number;
      }
    > = {};
    const excludedItems = config?.excludedItems || [];

    let minDate: Date | null = null;
    let maxDate: Date | null = null;
    let currentTotalProfit = 0;

    const allItemsRaw = items.map((item) => ({
      ...item,
      mappedName: productMappings[item.product] || item.product,
    }));

    allItemsRaw.forEach((item) => {
      if (item.date && !isNaN(item.date.getTime())) {
        if (!minDate || item.date.getTime() < minDate.getTime()) minDate = item.date;
        if (!maxDate || item.date.getTime() > maxDate.getTime()) maxDate = item.date;
      }

      const key = `${item.mappedName}-${item.supplier}`;
      if (!productStats[key]) {
        productStats[key] = {
          product: item.mappedName,
          supplier: item.supplier,
          qty: 0,
          rev: 0,
          profit: 0,
          totalCost: 0,
        };
      }

      const qty = Number(item.quantity ?? 0);
      const rev = Number(item.salesValue ?? 0);
      const profit = Number(item.profit ?? 0);
      const cost = Number(item.cost ?? 0);

      productStats[key].qty += qty;
      productStats[key].rev += rev;
      productStats[key].profit += profit;
      productStats[key].totalCost += cost * qty;

      if (!excludedItems.includes(item.product) && !excludedItems.includes(item.mappedName)) {
        currentTotalProfit += profit;
      }
    });

    const diffMonths =
      forceMonthCount ||
      (minDate && maxDate
        ? ((maxDate as Date).getFullYear() - (minDate as Date).getFullYear()) * 12 +
          ((maxDate as Date).getMonth() - (minDate as Date).getMonth()) +
          1
        : 1);

    if (!returnRaw) {
      setMonthCount(diffMonths); setTotalProfit(currentTotalProfit);
      setReportStartDate(minDate); setReportEndDate(maxDate);
    }

    const statsArray = Object.values(productStats).filter(
      (s) => !excludedItems.includes(s.product)
    );
    const totalBasis = statsArray.reduce(
      (acc, curr) => acc + (basis === 'revenue' ? curr.rev : curr.profit),
      0
    );

    const statsWithMonthly = statsArray.map((s) => ({
      ...s,
      monthlyProfit: s.profit / (diffMonths || 1),
      monthlyTurnover: s.qty / (diffMonths || 1),
    }));

    const totalMonthlyProfitVal = statsWithMonthly.reduce(
      (acc, curr) => acc + curr.monthlyProfit,
      0
    );
    const totalMonthlyTurnoverVal = statsWithMonthly.reduce(
      (acc, curr) => acc + curr.monthlyTurnover,
      0
    );

    let avgP = statsArray.length > 0 ? totalMonthlyProfitVal / statsArray.length : 0;
    let avgT = statsArray.length > 0 ? totalMonthlyTurnoverVal / statsArray.length : 0;

    if (config?.profitThresholdMode === 'custom' && config.profitThreshold > 0)
      avgP = config.profitThreshold;
    if (config?.turnoverThresholdMode === 'custom' && config.turnoverThreshold > 0)
      avgT = config.turnoverThreshold;

    const safeAvgP = isNaN(avgP) ? 0 : avgP;
    const safeAvgT = isNaN(avgT) ? 0 : avgT;

    if (!returnRaw) { setAvgProfitPerItem(safeAvgP); setAvgTurnoverPerItem(safeAvgT); }

    if (totalBasis === 0 || statsArray.length === 0) {
      if (!returnRaw) { setResults([]); setRawResults([]); }
      return {
        results: [],
        totalProfit: currentTotalProfit,
        monthCount: diffMonths,
        avgProfitPerItem: safeAvgP,
        avgTurnoverPerItem: safeAvgT,
        reportStartDate: minDate,
        reportEndDate: maxDate,
      };
    }

    statsArray.sort((a, b) => (basis === 'revenue' ? b.rev - a.rev : b.profit - a.profit));

    let currentSum = 0;
    const finalResults: ABCResult[] = statsArray.map((stat) => {
      const val = basis === 'revenue' ? stat.rev : stat.profit;
      currentSum += val;
      const accumulatedPercentage = (currentSum / totalBasis) * 100;

      let classification: 'A' | 'B' | 'C' = 'C';
      if (accumulatedPercentage <= 70) classification = 'A';
      else if (accumulatedPercentage <= 90) classification = 'B';

      const monthlyProfit = stat.profit / (diffMonths || 1);
      const monthlyTurnover = stat.qty / (diffMonths || 1);

      let quadrant: 1 | 2 | 3 | 4 = 4;
      if (monthlyTurnover >= safeAvgT && monthlyProfit >= safeAvgP) quadrant = 1;
      else if (monthlyTurnover < safeAvgT && monthlyProfit >= safeAvgP) quadrant = 2;
      else if (monthlyTurnover >= safeAvgT && monthlyProfit < safeAvgP) quadrant = 3;

      return {
        product: stat.product,
        supplier: stat.supplier,
        totalQuantity: stat.qty,
        totalRevenue: stat.rev,
        totalProfit: stat.profit,
        monthlyProfit,
        monthlyTurnover,
        avgCost: stat.qty > 0 ? stat.totalCost / stat.qty : 0,
        accumulatedPercentage,
        classification,
        quadrant,
      };
    });

    const allProductsList = Object.values(productStats).map((s) => {
      const mProfit = s.profit / (diffMonths || 1);
      const mTurnover = s.qty / (diffMonths || 1);
      let q: 1 | 2 | 3 | 4 = 4;
      if (mTurnover >= safeAvgT && mProfit >= safeAvgP) q = 1;
      else if (mTurnover < safeAvgT && mProfit >= safeAvgP) q = 2;
      else if (mTurnover >= safeAvgT && mProfit < safeAvgP) q = 3;

      return {
        product: s.product,
        supplier: s.supplier,
        qty: s.qty,
        rev: s.rev,
        profit: s.profit,
        cost: s.qty > 0 ? s.totalCost / s.qty : 0,
        quadrant: q,
      };
    });

    if (!returnRaw) {
      setResults(finalResults);
      setRawResults(finalResults);
      setAllProducts(allProductsList);
    }

    return {
      results: finalResults,
      allProducts: allProductsList,
      totalProfit: currentTotalProfit,
      monthCount: diffMonths,
      avgProfitPerItem: avgP,
      avgTurnoverPerItem: avgT,
      reportStartDate: minDate,
      reportEndDate: maxDate,
    };
  };

  const applyFilters = useCallback((
    filters: {
      suppliers: string[];
      minProfit?: number;
      maxProfit?: number;
      search: string;
    },
    config?: any
  ) => {
    let filtered = [...rawResults];
    if (filters.suppliers.length > 0)
      filtered = filtered.filter((r) => filters.suppliers.includes(r.supplier));
    if (filters.minProfit) filtered = filtered.filter((r) => r.totalProfit >= filters.minProfit!);
    if (filters.maxProfit) filtered = filtered.filter((r) => r.totalProfit <= filters.maxProfit!);
    if (filters.search) {
      const lowSearch = filters.search.toLowerCase();
      filtered = filtered.filter((r) => r.product.toLowerCase().includes(lowSearch));
    }

    let finalAvgP = 0,
      finalAvgT = 0;
    if (config?.profitThresholdMode === 'custom' && config.profitThreshold > 0)
      finalAvgP = config.profitThreshold;
    else if (filtered.length > 0)
      finalAvgP = filtered.reduce((acc, curr) => acc + curr.monthlyProfit, 0) / filtered.length;

    if (config?.turnoverThresholdMode === 'custom' && config.turnoverThreshold > 0)
      finalAvgT = config.turnoverThreshold;
    else if (filtered.length > 0)
      finalAvgT = filtered.reduce((acc, curr) => acc + curr.monthlyTurnover, 0) / filtered.length;

    setAvgProfitPerItem(finalAvgP);
    setAvgTurnoverPerItem(finalAvgT);
    setTotalProfit(filtered.reduce((acc, curr) => acc + curr.totalProfit, 0));

    const updatedWithQuadrants = filtered.map((r) => {
      let q: 1 | 2 | 3 | 4 = 4;
      const turnover = r.monthlyTurnover;
      const profit = r.monthlyProfit;
      if (turnover >= finalAvgT && profit >= finalAvgP) q = 1;
      else if (turnover < finalAvgT && profit >= finalAvgP) q = 2;
      else if (turnover >= finalAvgT && profit < finalAvgP) q = 3;
      return { ...r, quadrant: q };
    });

    setResults(updatedWithQuadrants);
  }, [rawResults]);

  const { validateAndRun: validateFetch } = fetchForm;
  const fetchFromBling = useCallback(async (startDate?: string, endDate?: string): Promise<SaleItem[]> => {
    const requestScope = scopeRef.current;
    const range = startDate !== undefined || endDate !== undefined ? { start: startDate || '', end: endDate || '' } : undefined;
    const finish = begin();
    try {
      const result = await validateFetch({ range }, async parsed => {
        const items: SaleItem[] = []; const startedAt = Date.now();
        for (let page = 1; page <= 50; page++) {
          if (!mountedRef.current || scopeRef.current !== requestScope) throw requestError('O contexto da consulta mudou.');
          const remaining = 90_000 - (Date.now() - startedAt);
          if (remaining <= 0) throw requestError('A busca no Bling excedeu o prazo. Reduza o período e tente novamente.');
          const response = await withTimeout(supabase.functions.invoke('bling-proxy', { body: {
            endpoint: '/pedidos/vendas', params: { pagina: page, limite: 100, dataInicial: parsed.range?.start, dataFinal: parsed.range?.end },
          } }), Math.min(15_000, remaining), null, 'Buscar página do relatório Bling');
          if (!mountedRef.current || scopeRef.current !== requestScope) throw requestError('O contexto da consulta mudou.');
          if (!response) throw requestError('A busca no Bling excedeu o prazo. Reduza o período e tente novamente.');
          if (response.error) throw requestError(response.error.message || 'A API do Bling recusou a consulta.');
          const receipt = blingReportPageSchema.safeParse(response.data);
          if (!receipt.success) throw requestError('O Bling retornou uma página inválida. Nenhum relatório foi gravado.');
          for (const order of receipt.data.data) {
            if (order.situacao?.id !== 6 && order.situacao?.id !== 9) continue;
            const date = order.data ? new Date(order.data) : new Date();
            if (!Number.isFinite(date.getTime())) throw requestError('O Bling retornou uma data de venda inválida.');
            for (const item of order.itens || []) {
              const salesValue = item.valor * item.quantidade;
              items.push({ date, product: item.descricao || 'Sem Descrição', supplier: 'Bling API', quantity: item.quantidade, cost: item.custo, salesValue, profit: salesValue - item.custo * item.quantidade });
            }
          }
          if (receipt.data.data.length < 100) return items;
        }
        throw requestError('O período ultrapassou o limite de páginas do relatório. Reduza o intervalo para obter todos os dados.');
      }, invalid);
      if (result === false) throw requestError('Não foi possível iniciar a consulta. Confira o período ou aguarde a consulta atual.');
      return result;
    } catch (failure) {
      if (scopeRef.current === requestScope) showError(failure instanceof Error ? failure.message : 'Não foi possível consultar o Bling.');
      throw failure;
    } finally { finish(); }
  }, [begin, invalid, showError, validateFetch, mountedRef, scopeRef]);

  return {
    loading: loading || persistenceLoading,
    error,
    sessionKey,
    getReport,
    getProductMappings,
    setLoading,
    results,
    rawResults,
    allProducts,
    setAllProducts,
    totalProfit,
    monthCount,
    savedReports,
    avgProfitPerItem,
    avgTurnoverPerItem,
    calculateABC,
    applyFilters,
    fetchFromBling,
    saveReport,
    listSavedReports,
    deleteReport,
    setResults,
    setRawResults,
    setTotalProfit,
    setMonthCount,
    setAvgProfitPerItem,
    setAvgTurnoverPerItem,
    updateReport,
    reportStartDate,
    reportEndDate,
    setReportStartDate,
    setReportEndDate,
  };
};
