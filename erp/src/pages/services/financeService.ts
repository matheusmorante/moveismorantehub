import { supabase } from '@/pages/utils/supabaseConfig';
import {
  FinancialCategory,
  AccountPayable,
  AccountReceivable,
  FinancialTransaction,
  ResultNature,
} from '../types/finance.type';

const FINANCE_LIST_PAGE_SIZE = 500;

const fetchAllFinancePages = async <T>(buildQuery: (from: number, to: number) => any) => {
  const rows: T[] = [];
  for (let from = 0; ; from += FINANCE_LIST_PAGE_SIZE) {
    const { data, error } = await buildQuery(from, from + FINANCE_LIST_PAGE_SIZE - 1);
    if (error) throw error;
    const page = Array.isArray(data) ? (data as T[]) : [];
    rows.push(...page);
    if (page.length < FINANCE_LIST_PAGE_SIZE) return rows;
  }
};

export function determineResultNature(
  categoryName?: string | null,
  type?: 'income' | 'expense'
): ResultNature {
  if (!categoryName) {
    return type === 'income' ? 'RECEITA' : 'DESPESA';
  }

  const nameLower = categoryName.toLowerCase().trim();

  if (
    nameLower.includes('aporte') ||
    nameLower.includes('empréstimo') ||
    nameLower.includes('emprestimo') ||
    nameLower.includes('financiamento') ||
    nameLower.includes('saldo inicial') ||
    nameLower.includes('devolução') ||
    nameLower.includes('devolucao') ||
    nameLower.includes('retirada de sócio') ||
    nameLower.includes('distribuição de lucros') ||
    nameLower.includes('distribuicao de lucros') ||
    nameLower.includes('amortização') ||
    nameLower.includes('amortizacao') ||
    nameLower.includes('compra de estoque') ||
    nameLower.includes('compra de mercadoria') ||
    nameLower.includes('compra de mercadorias')
  ) {
    return 'NAO_AFETA_RESULTADO';
  }

  return type === 'income' ? 'RECEITA' : 'DESPESA';
}

export const financeService = {
  determineResultNature,

  // --- Categorias ---
  async getCategories(type?: 'income' | 'expense') {
    let query = supabase.from('financial_categories').select('*');
    if (type) query = query.eq('type', type);
    const { data, error } = await query;
    if (error) throw error;
    const list = (data || []).map((c: any) => ({
      ...c,
      result_nature: c.result_nature || determineResultNature(c.name, c.type),
    })) as FinancialCategory[];

    return list.sort((a, b) => {
      const isAOther = a.name.trim().toLowerCase().startsWith('outra');
      const isBOther = b.name.trim().toLowerCase().startsWith('outra');
      if (isAOther && !isBOther) return 1;
      if (!isAOther && isBOther) return -1;
      return a.name.localeCompare(b.name, 'pt-BR');
    });
  },

  // --- Contas a Pagar ---
  async getPayables(status?: string) {
    return fetchAllFinancePages<AccountPayable>((from, to) => {
      let query = supabase
        .from('accounts_payable')
        .select('*, financial_categories(name)')
        .order('due_date', { ascending: true })
        .order('id', { ascending: true });
      if (status) query = query.eq('status', status);
      return query.range(from, to);
    });
  },

  async createPayable(payable: Omit<AccountPayable, 'id' | 'created_at' | 'updated_at'>) {
    const { data, error } = await supabase
      .from('accounts_payable')
      .insert([payable])
      .select()
      .single();
    if (error) throw error;
    return data as AccountPayable;
  },

  async bulkCreatePayables(payables: Omit<AccountPayable, 'id' | 'created_at' | 'updated_at'>[]) {
    const { data, error } = await supabase.from('accounts_payable').insert(payables).select();
    if (error) throw error;
    return data as AccountPayable[];
  },

  async updatePayable(id: string, updates: Partial<AccountPayable>) {
    const { data, error } = await supabase
      .from('accounts_payable')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data as AccountPayable;
  },

  // --- Despesas Fixas / Recorrentes ---
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

  async createRecurringExpense(expense: Omit<any, 'id' | 'created_at' | 'updated_at'>) {
    const { data, error } = await supabase
      .from('recurring_expenses')
      .insert([expense])
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async updateRecurringExpense(id: string, updates: Partial<any>) {
    const { data, error } = await supabase
      .from('recurring_expenses')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  // --- Contas a Receber ---
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

  async createReceivable(receivable: Omit<AccountReceivable, 'id' | 'created_at' | 'updated_at'>) {
    const { data, error } = await supabase
      .from('accounts_receivable')
      .insert([receivable])
      .select()
      .single();
    if (error) throw error;
    return data as AccountReceivable;
  },

  async updateReceivable(id: string, updates: Partial<AccountReceivable>) {
    const { data, error } = await supabase
      .from('accounts_receivable')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data as AccountReceivable;
  },

  // --- Fluxo de Caixa / Transações ---
  async getTransactions(startDate?: string, endDate?: string) {
    const transactions = await fetchAllFinancePages<FinancialTransaction>((from, to) => {
      let query = supabase
        .from('financial_transactions')
        .select('*, financial_categories(name)')
        .order('date', { ascending: false })
        .order('id', { ascending: true });
      if (startDate) query = query.gte('date', startDate);
      if (endDate) query = query.lte('date', endDate);
      return query.range(from, to);
    });
    return transactions.map((t: any) => ({
      ...t,
      result_nature:
        t.result_nature ||
        determineResultNature(t.financial_categories?.name || t.category_name, t.type),
    }));
  },

  async getReportTransactions(startDate?: string, endDate?: string) {
    const { data, error } = await supabase.rpc('get_report_financial_transactions', {
      p_start_date: startDate || null,
      p_end_date: endDate || null,
      p_end_exclusive: false,
    });
    if (error) throw error;
    return (data || []).map((t: any) => ({
      ...t,
      result_nature:
        t.result_nature || determineResultNature(t.category_name, t.type),
    }));
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

  async createTransaction(
    transaction: Omit<FinancialTransaction, 'id' | 'created_at' | 'updated_at'>
  ) {
    let catName = '';
    if (transaction.category_id) {
      const { data: cat } = await supabase
        .from('financial_categories')
        .select('name')
        .eq('id', transaction.category_id)
        .maybeSingle();
      if (cat?.name) catName = cat.name;
    }

    const payload = {
      ...transaction,
      result_nature: transaction.result_nature || determineResultNature(catName, transaction.type),
    };

    const { data, error } = await supabase
      .from('financial_transactions')
      .insert([payload])
      .select()
      .single();
    if (error) throw error;
    return data as FinancialTransaction;
  },

  async updateTransaction(id: string, updates: Partial<FinancialTransaction>) {
    const { data, error } = await supabase
      .from('financial_transactions')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data as FinancialTransaction;
  },

  async deleteTransaction(id: string) {
    const { data, error } = await supabase
      .from('financial_transactions')
      .delete()
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data as FinancialTransaction;
  },

  async getFinancialSummary(startDate?: string, endDate?: string) {
    const txs = await this.getReportTransactions(startDate, endDate);
    let totalIncome = 0;
    let totalExpense = 0;
    (txs || []).forEach((t: any) => {
      const val = Number(t.amount) || 0;
      if (t.type === 'income') totalIncome += val;
      else if (t.type === 'expense') totalExpense += val;
    });
    return {
      totalIncome,
      totalExpense,
      balance: totalIncome - totalExpense,
      count: (txs || []).length,
    };
  },

  // --- Integração Rede ---
  async getRedeConfig() {
    const { data, error } = await supabase.from('rede_config').select('*').single();
    if (error && error.code !== 'PGRST116') throw error; // Ignorar "não encontrado" (vazio)
    return data;
  },

  async updateRedeConfig(config: any) {
    const { data: existing } = await supabase.from('rede_config').select('id').single();
    let result;
    if (existing) {
      result = await supabase
        .from('rede_config')
        .update(config)
        .eq('id', existing.id)
        .select()
        .single();
    } else {
      result = await supabase.from('rede_config').insert([config]).select().single();
    }
    if (result.error) throw result.error;
    return result.data;
  },

  async getRedeTransactions(limit = 50) {
    const { data, error } = await supabase
      .from('rede_transactions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return data;
  },
};
