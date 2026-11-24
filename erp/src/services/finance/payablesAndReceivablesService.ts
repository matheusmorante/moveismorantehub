import type { z } from 'zod';
import { supabase } from '@/pages/utils/supabaseConfig';
import type {
  AccountPayable,
  AccountReceivable,
  FinancialCategory,
  RecurringExpense,
  ResultNature,
  TransactionType,
} from '@/pages/types/finance.type';
import {
  financialSettlementCommandSchema,
  financialSettlementResultSchema,
  payableWriteSchema,
  receivableWriteSchema,
  recurringPayableCommandSchema,
  recurringPayableCompactResultSchema,
} from '../../../../shared-utils/financialFormSchemas';
import {
  confirmedFinancialRow,
  determineResultNature,
  fetchAllFinancePages,
  orderFinancialCategories,
  parseSummaryCount,
  parseSummaryNumber,
  throwFinancialWriteError,
  type FinanceDashboardForecastSummary,
  type FinancePayablesPage,
  type FinanceReceivablesPage,
  type PayableCategoryOption,
} from './financeDomain';

type RawCategoryRow = {
  id: string;
  name: string;
  type: TransactionType;
  result_nature?: ResultNature | null;
  parent_id?: string | null;
};

export const payablesAndReceivablesService = {
  async settleAccount(input: z.input<typeof financialSettlementCommandSchema>) {
    const { kind, account } = financialSettlementCommandSchema.parse(input);
    const { data, error, status } = await supabase.rpc('settle_financial_account', {
      p_kind: kind, p_account_id: account.id, p_payment_date: account.date,
      p_expected: { description: account.description, amount: account.amount, category_id: account.category_id || null },
    });
    if (error) throwFinancialWriteError(error, status);
    const parsed = financialSettlementResultSchema.safeParse(data);
    if (!parsed.success || parsed.data.id !== account.id || parsed.data.payment_date !== account.date) {
      throw { uncertain: true };
    }
    return parsed.data;
  },

  async createRecurringPayableExpense(input: z.input<typeof recurringPayableCommandSchema>) {
    const command = recurringPayableCommandSchema.parse(input);
    const { data, error, status } = await supabase.rpc('create_recurring_payable_expense_compact', {
      p_request_id: command.request_id, p_payload: { payable: command.payable, frequency: command.frequency },
    });
    if (error) throwFinancialWriteError(error, status);
    const parsed = recurringPayableCompactResultSchema.safeParse(data);
    if (!parsed.success || parsed.data.recurring_expense_id !== command.request_id
      || parsed.data.payable_count !== 12) throw { uncertain: true };
    return parsed.data;
  },

  async getCategories(type?: 'income' | 'expense'): Promise<FinancialCategory[]> {
    let query = supabase.from('financial_categories').select('id,name,type,result_nature,parent_id');
    if (type) query = query.eq('type', type);
    const { data, error } = await query;
    if (error) throw error;
    const rows = (data || []) as RawCategoryRow[];
    const list: FinancialCategory[] = rows.map((c) => ({
      ...c,
      result_nature: c.result_nature || determineResultNature(c.name, c.type),
    }));

    return orderFinancialCategories(list);
  },

  async getPayableCategoryOptions(): Promise<PayableCategoryOption[]> {
    const { data, error } = await supabase
      .from('financial_categories')
      .select('id,name,parent_id')
      .eq('type', 'expense');
    if (error) throw error;
    return orderFinancialCategories((data || []) as PayableCategoryOption[]);
  },

  async getPayables(status?: string, search?: string, page = 1): Promise<FinancePayablesPage> {
    const safePage = Math.max(1, Math.floor(Number.isFinite(page) ? page : 1));
    const { data, error } = await supabase.rpc('get_finance_payables_page', {
      p_status: status || null,
      p_search: search?.trim() || null,
      p_page: safePage,
    });
    if (error) throw error;

    if (!data || typeof data !== 'object') throw { uncertain: true };
    const response = data as { items?: unknown; total_count?: unknown };
    if (!Array.isArray(response.items)
      || response.items.length > 15
      || typeof response.total_count !== 'number'
      || !Number.isInteger(response.total_count)
      || (response.total_count as number) < response.items.length
      || response.items.some((row) => !row || typeof row !== 'object' || !('id' in row) || typeof row.id !== 'string')) {
      throw { uncertain: true };
    }

    return {
      items: response.items as AccountPayable[],
      total_count: response.total_count as number,
    };
  },

  async createPayable(payable: Omit<AccountPayable, 'id' | 'created_at' | 'updated_at'>) {
    const payload = payableWriteSchema.parse(payable);
    const { data, error, status } = await supabase
      .from('accounts_payable')
      .insert([payload])
      .select()
      .single();
    if (error) throwFinancialWriteError(error, status);
    return confirmedFinancialRow<AccountPayable>(data);
  },

  async createPayableId(payable: Omit<AccountPayable, 'id' | 'created_at' | 'updated_at'>) {
    const payload = payableWriteSchema.parse(payable);
    const { data, error, status } = await supabase
      .from('accounts_payable')
      .insert([payload])
      .select('id')
      .single();
    if (error) throwFinancialWriteError(error, status);
    return confirmedFinancialRow<{ id: string }>(data);
  },

  async bulkCreatePayables(payables: Omit<AccountPayable, 'id' | 'created_at' | 'updated_at'>[]) {
    const payload = payableWriteSchema.array().min(1).parse(payables);
    const { data, error, status } = await supabase.from('accounts_payable').insert(payload).select('id');
    if (error) throwFinancialWriteError(error, status);
    if (!Array.isArray(data) || data.length !== payload.length) throw { uncertain: true };
    const rows = data.map((row) => confirmedFinancialRow<{ id: string }>(row));
    if (new Set(rows.map((row) => row.id)).size !== rows.length) throw { uncertain: true };
    return rows;
  },

  async updatePayable(id: string, updates: Partial<AccountPayable>) {
    const payload = payableWriteSchema.partial().parse(updates);
    const { data, error, status } = await supabase
      .from('accounts_payable')
      .update(payload)
      .eq('id', id)
      .select()
      .single();
    if (error) throwFinancialWriteError(error, status);
    return confirmedFinancialRow<AccountPayable>(data, id);
  },

  async updatePayableId(id: string, updates: Partial<AccountPayable>) {
    const payload = payableWriteSchema.partial().parse(updates);
    const { data, error, status } = await supabase
      .from('accounts_payable')
      .update(payload)
      .eq('id', id)
      .select('id')
      .single();
    if (error) throwFinancialWriteError(error, status);
    return confirmedFinancialRow<{ id: string }>(data, id);
  },

  async getRecurringExpenses(activeOnly: boolean = true) {
    let query = supabase
      .from('recurring_expenses')
      .select('*, financial_categories(name)')
      .order('created_at', { ascending: false });
    if (activeOnly) query = query.eq('active', true);
    const { data, error } = await query;
    if (error) throw error;
    return data;
  },

  async createRecurringExpense(expense: Omit<RecurringExpense, 'id' | 'created_at' | 'updated_at'>) {
    const { data, error } = await supabase
      .from('recurring_expenses')
      .insert([expense])
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async updateRecurringExpense(id: string, updates: Partial<RecurringExpense>) {
    const { data, error } = await supabase
      .from('recurring_expenses')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async getReceivables(status?: string) {
    return fetchAllFinancePages<AccountReceivable>((from, to) => {
      let query = supabase
        .from('accounts_receivable')
        .select('*, financial_categories(name)')
        .order('due_date', { ascending: true })
        .order('id', { ascending: true });
      if (status) query = query.eq('status', status);
      return query.range(from, to);
    });
  },

  async getReceivablesPage(status?: string, search?: string, page = 1): Promise<FinanceReceivablesPage> {
    const safePage = Math.max(1, Math.floor(Number.isFinite(page) ? page : 1));
    const { data, error } = await supabase.rpc('get_finance_receivables_page', {
      p_status: status || null,
      p_search: search?.trim() || null,
      p_page: safePage,
    });
    if (error) throw error;

    if (!data || typeof data !== 'object') throw { uncertain: true };
    const response = data as { items?: unknown; total_count?: unknown };
    if (!Array.isArray(response.items)
      || response.items.length > 15
      || typeof response.total_count !== 'number'
      || !Number.isInteger(response.total_count)
      || (response.total_count as number) < response.items.length
      || response.items.some((row) => !row || typeof row !== 'object' || !('id' in row) || typeof row.id !== 'string')) {
      throw { uncertain: true };
    }

    return {
      items: response.items as AccountReceivable[],
      total_count: response.total_count as number,
    };
  },

  async createReceivable(receivable: Omit<AccountReceivable, 'id' | 'created_at' | 'updated_at'>) {
    const payload = receivableWriteSchema.parse(receivable);
    const { data, error, status } = await supabase
      .from('accounts_receivable')
      .insert([payload])
      .select()
      .single();
    if (error) throwFinancialWriteError(error, status);
    return confirmedFinancialRow<AccountReceivable>(data);
  },

  async updateReceivable(id: string, updates: Partial<AccountReceivable>) {
    const payload = receivableWriteSchema.partial().parse(updates);
    const { data, error, status } = await supabase
      .from('accounts_receivable')
      .update(payload)
      .eq('id', id)
      .select()
      .single();
    if (error) throwFinancialWriteError(error, status);
    return confirmedFinancialRow<AccountReceivable>(data, id);
  },

  async updateReceivableId(id: string, updates: Partial<AccountReceivable>) {
    const payload = receivableWriteSchema.partial().parse(updates);
    const { data, error, status } = await supabase
      .from('accounts_receivable')
      .update(payload)
      .eq('id', id)
      .select('id')
      .single();
    if (error) throwFinancialWriteError(error, status);
    return confirmedFinancialRow<{ id: string }>(data, id);
  },

  async getReportPayables(status?: string) {
    const { data, error } = await supabase.rpc('get_report_accounts_payable', {
      p_status: status || null,
    });
    if (error) throw error;
    return data;
  },

  async getReportReceivables(status?: string) {
    const { data, error } = await supabase.rpc('get_report_accounts_receivable', {
      p_status: status || null,
    });
    if (error) throw error;
    return data;
  },

  async getDashboardForecastSummary(): Promise<FinanceDashboardForecastSummary> {
    const { data, error } = await supabase.rpc('get_finance_dashboard_forecast_summary');
    if (error) throw error;
    if (!data || typeof data !== 'object') throw { uncertain: true };

    const summary = data as {
      payables?: { pending_total?: unknown; overdue_total?: unknown; total?: unknown; count?: unknown };
      receivables?: { pending_total?: unknown; overdue_total?: unknown; total?: unknown; count?: unknown };
    };
    if (!summary.payables || typeof summary.payables !== 'object'
      || !summary.receivables || typeof summary.receivables !== 'object') throw { uncertain: true };

    return {
      payables: {
        pendingTotal: parseSummaryNumber(summary.payables.pending_total),
        overdueTotal: parseSummaryNumber(summary.payables.overdue_total),
        total: parseSummaryNumber(summary.payables.total),
        count: parseSummaryCount(summary.payables.count),
      },
      receivables: {
        pendingTotal: parseSummaryNumber(summary.receivables.pending_total),
        overdueTotal: parseSummaryNumber(summary.receivables.overdue_total),
        total: parseSummaryNumber(summary.receivables.total),
        count: parseSummaryCount(summary.receivables.count),
      },
    };
  },
};
