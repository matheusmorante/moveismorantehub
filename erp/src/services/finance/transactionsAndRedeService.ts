import type { z } from 'zod';
import { supabase } from '@/pages/utils/supabaseConfig';
import type { FinancialCategory, FinancialTransaction, ResultNature } from '@/pages/types/finance.type';
import { financialTransactionWriteSchema } from '../../../../shared-utils/financialFormSchemas';
import { redeConfigFormSchema } from '../../../../shared-utils/accountFormSchemas';
import {
  confirmedFinancialRow,
  determineResultNature,
  fetchAllFinancePages,
  throwFinancialWriteError,
  type FinancialTransactionPage,
  type FinancialTransactionPageFilters,
} from './financeDomain';
import { payablesAndReceivablesService } from './payablesAndReceivablesService';

const prepareFinancialTransactionCreatePayload = async (
  transaction: Omit<FinancialTransaction, 'id' | 'created_at' | 'updated_at'>
) => {
  const parsedTransaction = financialTransactionWriteSchema.parse(transaction);
  let catName = '';
  let categoryNature: ResultNature | undefined;
  if (parsedTransaction.category_id) {
    const { data: cat, error: categoryError } = await supabase
      .from('financial_categories')
      .select('name,type,result_nature')
      .eq('id', parsedTransaction.category_id)
      .maybeSingle();
    if (categoryError) throw categoryError;
    if (!cat) throw new Error('Categoria financeira indisponível.');
    if (cat.type !== parsedTransaction.type) throw new Error('Categoria incompatível com a movimentação.');
    if (cat?.name) catName = cat.name;
    categoryNature = cat.result_nature || undefined;
  }

  return {
    ...parsedTransaction,
    category_name: catName || parsedTransaction.category_name || null,
    result_nature: parsedTransaction.result_nature || categoryNature || determineResultNature(catName, parsedTransaction.type),
  };
};

export const transactionsAndRedeService = {
  async getTransactions(startDate?: string, endDate?: string, categories?: FinancialCategory[]) {
    const transactionColumns = 'id,type,amount,date,description,payment_method,category_id,category_name,result_nature,purpose,transaction_time,account_id,counterparty,collaborator_id,collaborator_name,vehicle_id,due_date,due_day,is_recurring,installments_total,installment_number,origin,created_by,status,idempotency_key,payable_id,receivable_id,notes,created_at,updated_at';
    const transactions = await fetchAllFinancePages<FinancialTransaction>((from, to) => {
      let query = supabase
        .from('financial_transactions')
        .select(transactionColumns)
        .order('date', { ascending: false })
        .order('id', { ascending: true });
      if (startDate) query = query.gte('date', startDate);
      if (endDate) query = query.lte('date', endDate);
      return query.range(from, to);
    });

    const categoryList = categories ?? await payablesAndReceivablesService.getCategories();
    const categoryNames = new Map(categoryList.map((category) => [category.id, category.name]));
    return transactions.map((t) => ({
      ...t,
      category_name: t.category_name || (t.category_id ? categoryNames.get(t.category_id) : undefined) || null,
      result_nature:
        t.result_nature ||
        determineResultNature(t.category_name || (t.category_id ? categoryNames.get(t.category_id) : undefined), t.type),
    }));
  },

  async getCollaborators() {
    const { data, error } = await supabase.from('profiles').select('id,full_name').limit(50);
    if (error) throw error;
    return (data || []).map((profile) => ({ id: profile.id, name: profile.full_name || 'Colaborador' }));
  },

  async getReportTransactions(startDate?: string, endDate?: string) {
    const { data, error } = await supabase.rpc('get_report_financial_transactions', {
      p_start_date: startDate || null,
      p_end_date: endDate || null,
      p_end_exclusive: false,
    });
    if (error) throw error;
    const rows = (data || []) as FinancialTransaction[];
    return rows.map((t) => ({
      ...t,
      result_nature:
        t.result_nature || determineResultNature(t.category_name, t.type),
    }));
  },

  async getTransactionPage(filters: FinancialTransactionPageFilters, page: number): Promise<FinancialTransactionPage> {
    const { data, error } = await supabase.rpc('get_financial_transaction_page', {
      p_start_date: null,
      p_end_date: null,
      p_type: filters.type || 'all',
      p_category_id: filters.categoryId || null,
      p_payment_method: filters.paymentMethod || null,
      p_account_id: filters.accountId || null,
      p_created_by: filters.createdBy || null,
      p_search: filters.search?.trim() || null,
      p_limit: 15,
      p_offset: Math.max(0, Math.floor(page - 1)) * 15,
    });
    if (error) throw error;
    if (!data || typeof data !== 'object' || !Array.isArray((data as { rows?: unknown }).rows)) {
      throw new Error('Resposta inválida ao carregar movimentações.');
    }
    const result = data as FinancialTransactionPage;
    return {
      ...result,
      rows: result.rows.map((transaction) => ({
        ...transaction,
        amount: Number(transaction.amount) || 0,
        category_name: transaction.category_name || null,
        result_nature: transaction.result_nature || determineResultNature(transaction.category_name, transaction.type),
      })),
      total_count: Number(result.total_count) || 0,
      income_total: Number(result.income_total) || 0,
      expense_total: Number(result.expense_total) || 0,
    };
  },

  async createTransaction(
    transaction: Omit<FinancialTransaction, 'id' | 'created_at' | 'updated_at'>
  ) {
    const payload = await prepareFinancialTransactionCreatePayload(transaction);
    const { data, error, status } = await supabase
      .from('financial_transactions')
      .insert([payload])
      .select()
      .single();
    if (error) throwFinancialWriteError(error, status);
    return confirmedFinancialRow<FinancialTransaction>(data);
  },

  async createTransactionId(
    transaction: Omit<FinancialTransaction, 'id' | 'created_at' | 'updated_at'>
  ) {
    const payload = await prepareFinancialTransactionCreatePayload(transaction);
    const { data, error, status } = await supabase
      .from('financial_transactions')
      .insert([payload])
      .select('id')
      .single();
    if (error) throwFinancialWriteError(error, status);
    return confirmedFinancialRow<{ id: string }>(data);
  },

  async updateTransaction(id: string, updates: Partial<FinancialTransaction>) {
    const payload = financialTransactionWriteSchema.partial().parse(updates);
    const { data, error } = await supabase
      .from('financial_transactions')
      .update(payload)
      .eq('id', id)
      .select('id')
      .single();
    if (error) throwFinancialWriteError(error);
    return confirmedFinancialRow<{ id: string }>(data, id);
  },

  async reverseTransaction(id: string) {
    const { data, error } = await supabase
      .from('financial_transactions')
      .update({ status: 'REVERSED', updated_at: new Date().toISOString() })
      .eq('id', id)
      .neq('status', 'REVERSED')
      .select('id')
      .single();
    if (error) throwFinancialWriteError(error);
    return confirmedFinancialRow<{ id: string }>(data, id);
  },

  async deleteTransaction(id: string) {
    const { data, error } = await supabase
      .from('financial_transactions')
      .delete()
      .eq('id', id)
      .select('id')
      .single();
    if (error) throwFinancialWriteError(error);
    return confirmedFinancialRow<{ id: string }>(data, id);
  },

  async getFinancialSummary(startDate?: string, endDate?: string) {
    const { data, error } = await supabase.rpc('get_financial_assistant_summary', {
      p_start_date: startDate || null,
      p_end_date: endDate || null,
    });
    if (error) throw error;

    const summary = data as {
      total_income?: unknown;
      total_expense?: unknown;
      balance?: unknown;
      count?: unknown;
    } | null;
    const totalIncome = Number(summary?.total_income) || 0;
    const totalExpense = Number(summary?.total_expense) || 0;
    return {
      totalIncome,
      totalExpense,
      balance: Number(summary?.balance) || 0,
      count: Number(summary?.count) || 0,
    };
  },

  async getRedeConfig() {
    const { data, error } = await supabase.from('rede_config').select('*').maybeSingle();
    if (error) throw error;
    return data;
  },

  async updateRedeConfig(config: z.input<typeof redeConfigFormSchema>) {
    const payload = redeConfigFormSchema.parse(config);
    const { data: existing, error: lookupError } = await supabase.from('rede_config').select('id').maybeSingle();
    if (lookupError) throw lookupError;
    let result;
    if (existing) {
      result = await supabase
        .from('rede_config')
        .update(payload)
        .eq('id', existing.id)
        .select()
        .single();
    } else {
      result = await supabase.from('rede_config').insert([payload]).select().single();
    }
    if (result.error) throwFinancialWriteError(result.error, result.status);
    return confirmedFinancialRow<{ id: string }>(result.data, existing?.id);
  },

  async getRedeTransactions(limit = 50) {
    const { data, error } = await supabase
      .from('rede_transactions')
      .select('tid, status, amount, created_at')
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return data;
  },
};
