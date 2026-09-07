import { supabase } from '../supabaseClient';
import {
  MonthlySummary,
  CashFlowReport,
  IncomeStatementReport,
  MonthlyEvolutionItem,
} from './mobileFinanceTypes';
import { fetchFinancialCategories, determineResultNature } from './mobileCategoryService';

export const fetchMonthlySummary = async (year: number, month: number): Promise<MonthlySummary> => {
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;
  const endDate = `${nextYear}-${String(nextMonth).padStart(2, '0')}-01`;

  let queryRes = await supabase
    .from('financial_transactions')
    .select('type, amount, status')
    .gte('date', startDate)
    .lt('date', endDate);

  if (queryRes.error && queryRes.error.message?.includes('status')) {
    queryRes = await supabase
      .from('financial_transactions')
      .select('type, amount')
      .gte('date', startDate)
      .lt('date', endDate);
  }

  const { data, error } = queryRes;

  if (error) {
    console.warn('Erro ao consultar resumo mensal:', error.message);
    return { income: 0, expense: 0, balance: 0 };
  }

  let income = 0;
  let expense = 0;

  (data || []).forEach((row: any) => {
    if (row.status === 'REVERSED' || row.status === 'CANCELLED' || row.status === 'PENDING') return;
    const val = Number(row.amount) || 0;
    if (row.type === 'income') {
      income += val;
    } else if (row.type === 'expense') {
      expense += val;
    }
  });

  return {
    income,
    expense,
    balance: income - expense,
  };
};

export const fetchCashFlowReport = async (year: number, month: number): Promise<CashFlowReport> => {
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;
  const endDate = `${nextYear}-${String(nextMonth).padStart(2, '0')}-01`;

  let [priorRes, currentRes] = await Promise.all([
    supabase.from('financial_transactions').select('type, amount, status').lt('date', startDate),
    supabase.from('financial_transactions').select('type, amount, status').gte('date', startDate).lt('date', endDate),
  ]);

  if (priorRes.error && priorRes.error.message?.includes('status')) {
    [priorRes, currentRes] = await Promise.all([
      supabase.from('financial_transactions').select('type, amount').lt('date', startDate),
      supabase.from('financial_transactions').select('type, amount').gte('date', startDate).lt('date', endDate),
    ]);
  }

  const priorData = priorRes.data || [];
  const currentData = currentRes.data || [];

  let initialBalance = 0;
  priorData.forEach((row: any) => {
    if (row.status === 'REVERSED' || row.status === 'CANCELLED' || row.status === 'PENDING') return;
    const val = Number(row.amount) || 0;
    if (row.type === 'income') initialBalance += val;
    else if (row.type === 'expense') initialBalance -= val;
  });

  let totalInflow = 0;
  let totalOutflow = 0;
  currentData.forEach((row: any) => {
    if (row.status === 'REVERSED' || row.status === 'CANCELLED' || row.status === 'PENDING') return;
    const val = Number(row.amount) || 0;
    if (row.type === 'income') totalInflow += val;
    else if (row.type === 'expense') totalOutflow += val;
  });

  const netCashFlow = totalInflow - totalOutflow;
  const finalBalance = initialBalance + netCashFlow;

  return {
    initialBalance,
    totalInflow,
    totalOutflow,
    netCashFlow,
    finalBalance,
  };
};

export const fetchIncomeStatementReport = async (year: number, month: number): Promise<IncomeStatementReport> => {
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;
  const endDate = `${nextYear}-${String(nextMonth).padStart(2, '0')}-01`;

  const [categories, { data }] = await Promise.all([
    fetchFinancialCategories(),
    supabase.from('financial_transactions').select('*').gte('date', startDate).lt('date', endDate),
  ]);

  const catMap = new Map(categories.map(c => [c.name.toLowerCase(), c.result_nature || determineResultNature(c.name, c.type)]));

  let grossRevenue = 0;
  let operatingExpenses = 0;

  (data || []).forEach((row: any) => {
    if (row.status === 'REVERSED' || row.status === 'CANCELLED' || row.status === 'PENDING') return;

    const nature = row.result_nature || catMap.get((row.category_name || '').toLowerCase()) || determineResultNature(row.category_name, row.type);
    if (nature === 'NAO_AFETA_RESULTADO') return;

    const val = Number(row.amount) || 0;
    if (row.type === 'income' || nature === 'RECEITA') {
      grossRevenue += val;
    } else if (row.type === 'expense' || nature === 'DESPESA') {
      operatingExpenses += val;
    }
  });

  const cmv = Math.round(grossRevenue * 0.52);
  const grossMargin = grossRevenue - cmv;
  const netResult = grossMargin - operatingExpenses;
  const marginPercent = grossRevenue > 0 ? Number(((netResult / grossRevenue) * 100).toFixed(1)) : 0;

  return {
    grossRevenue,
    cmv,
    grossMargin,
    operatingExpenses,
    netResult,
    marginPercent,
  };
};

export const fetchMonthlyEvolutionReport = async (year: number): Promise<MonthlyEvolutionItem[]> => {
  const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  const items: MonthlyEvolutionItem[] = [];

  for (let m = 1; m <= 12; m++) {
    const dre = await fetchIncomeStatementReport(year, m);
    items.push({
      monthName: monthNames[m - 1],
      monthIndex: m,
      revenue: dre.grossRevenue,
      cmv: dre.cmv,
      grossMargin: dre.grossMargin,
      expenses: dre.operatingExpenses,
      result: dre.netResult,
      marginPercent: dre.marginPercent,
    });
  }

  return items;
};
