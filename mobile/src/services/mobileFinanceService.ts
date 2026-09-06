import { supabase } from './supabaseClient';

export type ResultNature = 'RECEITA' | 'DESPESA' | 'NAO_AFETA_RESULTADO';

export interface FinancialCategory {
  id: string;
  name: string;
  type: 'income' | 'expense';
  movement_type?: 'income' | 'expense';
  result_nature?: ResultNature;
}

export interface FinancialTransaction {
  id: string;
  type: 'income' | 'expense'; // income = ENTRADA, expense = SAÍDA
  amount: number;
  date: string;
  transaction_time?: string | null;
  description: string;
  payment_method: string;
  category_id?: string | null;
  category_name?: string | null;
  result_nature?: ResultNature;
  account_id?: string | null;
  counterparty?: string | null;
  collaborator_id?: string | null;
  collaborator_name?: string | null;
  purpose?: string | null;
  vehicle_id?: string | null;
  due_date?: string | null;
  due_day?: number | null;
  is_recurring?: boolean | null;
  installments_total?: number | null;
  installment_number?: number | null;
  notes?: string | null;
  origin: 'MANUAL' | 'AI_ASSISTANT' | 'SALE_ORDER' | 'PURCHASE_ORDER' | 'PAYABLE_PAYMENT' | 'INITIAL_BALANCE' | 'IMPORT' | 'SYSTEM';
  created_by?: string | null;
  status: 'ACTIVE' | 'PENDING' | 'PAID' | 'REVERSED' | 'CANCELLED';
  created_at: string;
  updated_at: string;
}

export interface MonthlySummary {
  income: number;   // Total de Entradas Efetivas
  expense: number;  // Total de Saídas Efetivas
  balance: number;  // Saldo Financeiro de Caixa
}

export interface CashFlowReport {
  initialBalance: number;
  totalInflow: number;
  totalOutflow: number;
  netCashFlow: number;
  finalBalance: number;
}

export interface IncomeStatementReport {
  grossRevenue: number;     // Receitas efetivas
  cmv: number;              // Custo da Mercadoria Vendida
  grossMargin: number;      // Receitas - CMV
  operatingExpenses: number;// Despesas operacionais e financeiras
  netResult: number;        // Resultado Líquido
  marginPercent: number;    // % Lucratividade
}

export interface MonthlyEvolutionItem {
  monthName: string;
  monthIndex: number;
  revenue: number;
  cmv: number;
  grossMargin: number;
  expenses: number;
  result: number;
  marginPercent: number;
}

export interface TransactionFilterOptions {
  type?: 'income' | 'expense' | 'all';
  categoryId?: string;
  paymentMethod?: string;
  createdBy?: string;
  collaboratorId?: string;
  searchQuery?: string;
}

export const DEFAULT_FINANCIAL_CATEGORIES: FinancialCategory[] = [
  // ENTRADAS
  { id: 'cat_juros_rec', name: 'Juros e Rendimentos Recebidos', type: 'income', result_nature: 'RECEITA' },
  { id: 'cat_restituicao', name: 'Restituição / Recuperação Tributária', type: 'income', result_nature: 'RECEITA' },
  { id: 'cat_aluguel_rec', name: 'Aluguel Recebido', type: 'income', result_nature: 'RECEITA' },
  { id: 'cat_outras_rec', name: 'Outras Receitas', type: 'income', result_nature: 'RECEITA' },
  { id: 'cat_aporte', name: 'Aporte de Sócio', type: 'income', result_nature: 'NAO_AFETA_RESULTADO' },
  { id: 'cat_emprestimo_rec', name: 'Empréstimo Recebido', type: 'income', result_nature: 'NAO_AFETA_RESULTADO' },
  { id: 'cat_devolucao_rec', name: 'Devolução / Recuperação de Valor', type: 'income', result_nature: 'NAO_AFETA_RESULTADO' },
  { id: 'cat_saldo_inicial', name: 'Saldo Inicial de Implantação', type: 'income', result_nature: 'NAO_AFETA_RESULTADO' },

  // SAÍDAS
  { id: 'cat_combustivel', name: 'Combustível', type: 'expense', result_nature: 'DESPESA' },
  { id: 'cat_veiculo_manut', name: 'Manutenção de Veículos', type: 'expense', result_nature: 'DESPESA' },
  { id: 'cat_salarios', name: 'Salários', type: 'expense', result_nature: 'DESPESA' },
  { id: 'cat_comissao', name: 'Comissão', type: 'expense', result_nature: 'DESPESA' },
  { id: 'cat_adiantamento', name: 'Adiantamento Salarial', type: 'expense', result_nature: 'DESPESA' },
  { id: 'cat_beneficios', name: 'Benefícios / VR / VT', type: 'expense', result_nature: 'DESPESA' },
  { id: 'cat_aluguel_pag', name: 'Aluguel do Galpão / Loja', type: 'expense', result_nature: 'DESPESA' },
  { id: 'cat_energia', name: 'Energia Elétrica', type: 'expense', result_nature: 'DESPESA' },
  { id: 'cat_agua_internet', name: 'Água e Internet', type: 'expense', result_nature: 'DESPESA' },
  { id: 'cat_impostos', name: 'Impostos e Tributos', type: 'expense', result_nature: 'DESPESA' },
  { id: 'cat_tarifas', name: 'Tarifas Bancárias e Taxas de Cartão', type: 'expense', result_nature: 'DESPESA' },
  { id: 'cat_juros_pag', name: 'Juros e Multas Pagos', type: 'expense', result_nature: 'DESPESA' },
  { id: 'cat_despesa_geral', name: 'Despesa não classificada', type: 'expense', result_nature: 'DESPESA' },
  { id: 'cat_emprestimo_pag', name: 'Pagamento de Empréstimo (Amortização de Principal)', type: 'expense', result_nature: 'NAO_AFETA_RESULTADO' },
  { id: 'cat_prolabore_retirada', name: 'Retirada de Sócio / Distribuição de Lucros', type: 'expense', result_nature: 'NAO_AFETA_RESULTADO' },
  { id: 'cat_estoque_compra', name: 'Compra de Estoque / Mercadorias', type: 'expense', result_nature: 'NAO_AFETA_RESULTADO' },
];

/**
 * Determina deterministicamente se uma categoria afeta o resultado (DRE) ou apenas o caixa (Patrimonial)
 */
export const determineResultNature = (categoryName?: string | null, type?: 'income' | 'expense'): ResultNature => {
  if (!categoryName) return type === 'income' ? 'RECEITA' : 'DESPESA';
  const nameLower = categoryName.toLowerCase();

  if (
    nameLower.includes('aporte') ||
    nameLower.includes('empréstimo recebido') ||
    nameLower.includes('emprestimo recebido') ||
    nameLower.includes('saldo inicial') ||
    nameLower.includes('devolução') ||
    nameLower.includes('devolucao') ||
    nameLower.includes('retirada de sócio') ||
    nameLower.includes('distribuição de lucros') ||
    nameLower.includes('amortização') ||
    nameLower.includes('compra de estoque') ||
    nameLower.includes('compra de mercadoria')
  ) {
    return 'NAO_AFETA_RESULTADO';
  }

  return type === 'income' ? 'RECEITA' : 'DESPESA';
};

export const fetchFinancialCategories = async (): Promise<FinancialCategory[]> => {
  try {
    const { data, error } = await supabase
      .from('financial_categories')
      .select('*')
      .order('name', { ascending: true });

    if (!error && data && data.length > 0) {
      return data.map(c => ({
        ...c,
        result_nature: c.result_nature || determineResultNature(c.name, c.type),
      }));
    }
  } catch {}

  return DEFAULT_FINANCIAL_CATEGORIES;
};

export const fetchMonthlySummary = async (year: number, month: number): Promise<MonthlySummary> => {
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;
  const endDate = `${nextYear}-${String(nextMonth).padStart(2, '0')}-01`;

  const { data, error } = await supabase
    .from('financial_transactions')
    .select('type, amount, status')
    .gte('date', startDate)
    .lt('date', endDate);

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

/**
 * 1. Relatório de Fluxo de Caixa (Visão Completa do Dinheiro Entrado vs Saído)
 */
export const fetchCashFlowReport = async (year: number, month: number): Promise<CashFlowReport> => {
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;
  const endDate = `${nextYear}-${String(nextMonth).padStart(2, '0')}-01`;

  // Buscar saldo anterior a esta data
  const [{ data: priorData }, { data: currentData }] = await Promise.all([
    supabase.from('financial_transactions').select('type, amount, status').lt('date', startDate),
    supabase.from('financial_transactions').select('type, amount, status').gte('date', startDate).lt('date', endDate),
  ]);

  let initialBalance = 0;
  (priorData || []).forEach((row: any) => {
    if (row.status === 'REVERSED' || row.status === 'CANCELLED' || row.status === 'PENDING') return;
    const val = Number(row.amount) || 0;
    if (row.type === 'income') initialBalance += val;
    else if (row.type === 'expense') initialBalance -= val;
  });

  let totalInflow = 0;
  let totalOutflow = 0;
  (currentData || []).forEach((row: any) => {
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

/**
 * 2. Relatório de Resultado Operacional DRE (Ganhos Reais vs Despesas Reais)
 */
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
    if (nature === 'NAO_AFETA_RESULTADO') return; // Exclui Aportes, Empréstimos, Saldo Inicial, Amortização

    const val = Number(row.amount) || 0;
    if (row.type === 'income' || nature === 'RECEITA') {
      grossRevenue += val;
    } else if (row.type === 'expense' || nature === 'DESPESA') {
      operatingExpenses += val;
    }
  });

  // CMV estimado da operação do ERP
  const cmv = Math.round(grossRevenue * 0.52); // Estimativa CMPM de estoque do ERP
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

/**
 * 3. Relatório de Evolução Mensal (Comparativo mês a mês do ano)
 */
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

export const fetchTransactionsForMonth = async (
  year: number,
  month: number,
  filters?: TransactionFilterOptions
): Promise<FinancialTransaction[]> => {
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;
  const endDate = `${nextYear}-${String(nextMonth).padStart(2, '0')}-01`;

  let query = supabase
    .from('financial_transactions')
    .select('*')
    .gte('date', startDate)
    .lt('date', endDate)
    .order('date', { ascending: false })
    .order('created_at', { ascending: false });

  if (filters?.type && filters.type !== 'all') {
    query = query.eq('type', filters.type);
  }
  if (filters?.categoryId) {
    query = query.eq('category_id', filters.categoryId);
  }
  if (filters?.paymentMethod) {
    query = query.eq('payment_method', filters.paymentMethod);
  }
  if (filters?.createdBy) {
    query = query.eq('created_by', filters.createdBy);
  }

  const [categories, { data, error }] = await Promise.all([
    fetchFinancialCategories(),
    query,
  ]);

  if (error) {
    console.warn('Erro ao consultar transações:', error.message);
    return [];
  }

  const categoryMap = new Map(categories.map(c => [c.id, c.name]));

  let list: FinancialTransaction[] = (data || []).map((row: any) => {
    const catName = (row.category_id && categoryMap.get(row.category_id)) || row.category_name || 'Despesa não classificada';
    return {
      id: row.id,
      type: row.type,
      amount: Number(row.amount) || 0,
      date: row.date,
      transaction_time: row.transaction_time || null,
      description: row.description,
      payment_method: row.payment_method || 'PIX',
      category_id: row.category_id || null,
      category_name: catName,
      result_nature: row.result_nature || determineResultNature(catName, row.type),
      account_id: 'Caixa Geral',
      counterparty: row.counterparty || null,
      collaborator_id: row.collaborator_id || null,
      collaborator_name: row.collaborator_name || null,
      purpose: row.purpose || 'BUSINESS',
      vehicle_id: row.vehicle_id || null,
      notes: row.notes || null,
      origin: row.origin || 'MANUAL',
      created_by: row.created_by || null,
      status: row.status || 'ACTIVE',
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  });

  if (filters?.searchQuery && filters.searchQuery.trim()) {
    const q = filters.searchQuery.toLowerCase().trim();
    list = list.filter(
      t =>
        t.description.toLowerCase().includes(q) ||
        (t.category_name && t.category_name.toLowerCase().includes(q)) ||
        (t.counterparty && t.counterparty.toLowerCase().includes(q)) ||
        (t.collaborator_name && t.collaborator_name.toLowerCase().includes(q))
    );
  }

  return list;
};

export const createFinancialTransaction = async (
  payload: Partial<FinancialTransaction>
): Promise<{ success: boolean; data?: FinancialTransaction; error?: string }> => {
  if (!payload.amount || payload.amount <= 0) {
    return { success: false, error: 'O valor da movimentação deve ser maior que zero.' };
  }
  if (!payload.type || (payload.type !== 'income' && payload.type !== 'expense')) {
    return { success: false, error: 'Tipo de movimentação inválido.' };
  }
  if (!payload.description || !payload.description.trim()) {
    return { success: false, error: 'A descrição da movimentação é obrigatória.' };
  }

  const resultNature = payload.result_nature || determineResultNature(payload.category_name, payload.type);

  const fullRecord: any = {
    type: payload.type,
    amount: payload.amount,
    date: payload.date || new Date().toISOString().split('T')[0],
    description: payload.description.trim(),
    payment_method: payload.payment_method || 'PIX',
    category_id: payload.category_id || null,
    category_name: payload.category_name || 'Despesa não classificada',
    result_nature: resultNature,
    account_id: 'Caixa Geral',
    counterparty: payload.counterparty || null,
    collaborator_id: payload.collaborator_id || null,
    collaborator_name: payload.collaborator_name || null,
    purpose: payload.purpose || 'BUSINESS',
    vehicle_id: payload.vehicle_id || null,
    due_date: payload.due_date || null,
    due_day: payload.due_day || null,
    is_recurring: payload.is_recurring || false,
    installments_total: payload.installments_total || null,
    origin: payload.origin || 'MANUAL',
    created_by: payload.created_by || 'Operador',
    status: payload.status || 'ACTIVE',
  };

  const insertRes = await supabase
    .from('financial_transactions')
    .insert([fullRecord])
    .select()
    .single();

  if (insertRes.error) {
    console.error('Erro ao salvar movimentação financeira:', insertRes.error);
    return { success: false, error: insertRes.error.message };
  }

  const data = insertRes.data;
  const inserted: FinancialTransaction = {
    id: data.id,
    type: data.type,
    amount: Number(data.amount) || 0,
    date: data.date,
    transaction_time: data.transaction_time || null,
    description: data.description,
    payment_method: data.payment_method || 'PIX',
    category_id: data.category_id || null,
    category_name: data.category_name || 'Despesa',
    result_nature: data.result_nature || resultNature,
    account_id: 'Caixa Geral',
    counterparty: data.counterparty || null,
    collaborator_id: data.collaborator_id || null,
    collaborator_name: data.collaborator_name || null,
    purpose: data.purpose || 'BUSINESS',
    vehicle_id: data.vehicle_id || null,
    notes: data.notes || null,
    origin: data.origin || 'MANUAL',
    created_by: data.created_by || null,
    status: data.status || 'ACTIVE',
    created_at: data.created_at,
    updated_at: data.updated_at,
  };

  return { success: true, data: inserted };
};

export interface ConfirmDraftResult {
  success: boolean;
  recordId?: string;
  transactionIds?: string[];
  payableIds?: string[];
  error?: string;
}

export const confirmFinancialDraft = async (
  draft: any,
  idempotencyKey?: string,
  userName: string = 'Operador'
): Promise<ConfirmDraftResult> => {
  try {
    const todayStr = new Date().toISOString().split('T')[0];
    const supplierName = draft.supplier || draft.counterparty || 'Fornecedor';

    // 1. Idempotência: Se houver chave de idempotência, verificar se o registro já existe
    if (idempotencyKey) {
      const { data: existing } = await supabase
        .from('financial_transactions')
        .select('id')
        .eq('notes', `IDEMPOTENCY_${idempotencyKey}`)
        .limit(1);

      if (existing && existing.length > 0) {
        return {
          success: true,
          recordId: existing[0].id,
          transactionIds: existing.map(e => e.id),
        };
      }
    }

    // 2. Operação com Conta a Pagar Pendente Já Existente (Baixa / Pagamento)
    if ((draft.intentType === 'QUERY_OR_UPDATE' || draft.intentType === 'MATCH_EXISTING') && draft.matchedAccount) {
      const res = await payPayableAccount(
        draft.matchedAccount.id,
        draft.paymentMethod || 'PIX',
        draft.date || todayStr
      );
      if (!res.success) return { success: false, error: res.error };
      return {
        success: true,
        recordId: res.data?.id || draft.matchedAccount.id,
        transactionIds: [res.data?.id || draft.matchedAccount.id],
      };
    }

    // 3. Operação de Parcelamento (Atomic Batch Insert)
    if (draft.intentType === 'INSTALLMENT' && draft.installmentList && draft.installmentList.length > 0) {
      const totalCount = draft.installmentList.length;
      const recordsToInsert = draft.installmentList.map((item: any) => {
        const resultNature = determineResultNature(draft.categoryName || 'Compra de estoque', 'expense');
        return {
          type: 'expense',
          amount: item.amount,
          date: draft.date || todayStr,
          description: `Compra • ${supplierName} (${item.number}/${totalCount})`,
          payment_method: draft.paymentMethod || 'Boleto',
          category_id: draft.categoryId || null,
          category_name: draft.categoryName || 'Compra de estoque',
          result_nature: resultNature,
          account_id: 'Caixa Geral',
          counterparty: supplierName,
          purpose: draft.purpose || 'BUSINESS',
          vehicle_id: draft.vehicleId || null,
          due_date: item.dueDate || null,
          due_day: draft.dueDay || null,
          is_recurring: false,
          installment_number: item.number,
          installments_total: totalCount,
          origin: 'AI_ASSISTANT',
          created_by: userName,
          status: 'PENDING',
          notes: idempotencyKey ? `IDEMPOTENCY_${idempotencyKey}` : null,
        };
      });

      const batchRes = await supabase
        .from('financial_transactions')
        .insert(recordsToInsert)
        .select();

      if (batchRes.error) {
        return { success: false, error: batchRes.error.message };
      }

      const inserted = batchRes.data || [];
      const ids = inserted.map((r: any) => r.id);
      return {
        success: true,
        recordId: ids[0] || undefined,
        transactionIds: ids,
        payableIds: ids,
      };
    }

    // 4. Lançamento Único (Entrada, Saída, Boleto a Pagar ou Recorrente)
    const isPayable = draft.intentType === 'PAYABLE_BILL';
    const isRecurring = draft.intentType === 'RECURRING';

    const res = await createFinancialTransaction({
      type: draft.type || 'expense',
      amount: draft.amount || draft.totalAmount || 0,
      description: draft.supplier || draft.description || 'Lançamento via IA',
      category_id: draft.categoryId || null,
      category_name: draft.categoryName || (draft.type === 'income' ? 'Outras receitas' : 'Despesa não classificada'),
      payment_method: draft.paymentMethod || (isPayable ? 'Boleto' : 'PIX'),
      purpose: draft.purpose || 'BUSINESS',
      vehicle_id: draft.vehicleId || null,
      counterparty: draft.supplier || draft.counterparty || null,
      due_date: draft.dueDate || draft.date || null,
      due_day: draft.dueDay || null,
      is_recurring: isRecurring,
      installments_total: draft.installmentsCount || null,
      origin: 'AI_ASSISTANT',
      created_by: userName,
      date: draft.date || todayStr,
      status: isPayable ? 'PENDING' : 'ACTIVE',
      notes: idempotencyKey ? `IDEMPOTENCY_${idempotencyKey}` : null,
    });

    if (!res.success) return { success: false, error: res.error };
    return {
      success: true,
      recordId: res.data?.id,
      transactionIds: res.data?.id ? [res.data.id] : [],
    };
  } catch (err: any) {
    return { success: false, error: err.message || 'Erro inesperado ao confirmar rascunho.' };
  }
};

export const reverseFinancialTransaction = async (
  id: string
): Promise<{ success: boolean; error?: string }> => {
  const { error } = await supabase
    .from('financial_transactions')
    .update({ status: 'REVERSED', updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) {
    return { success: false, error: error.message };
  }
  return { success: true };
};

export const fetchPayableAccounts = async (): Promise<FinancialTransaction[]> => {
  const [categories, { data, error }] = await Promise.all([
    fetchFinancialCategories(),
    supabase
      .from('financial_transactions')
      .select('*')
      .eq('status', 'PENDING')
      .order('date', { ascending: true }),
  ]);

  if (error) {
    console.warn('Erro ao buscar contas a pagar:', error.message);
    return [];
  }

  const categoryMap = new Map(categories.map(c => [c.id, c.name]));

  return (data || []).map((row: any) => ({
    id: row.id,
    type: row.type,
    amount: Number(row.amount) || 0,
    date: row.date,
    transaction_time: row.transaction_time,
    description: row.description,
    payment_method: row.payment_method || 'Boleto',
    category_id: row.category_id,
    category_name: (row.category_id && categoryMap.get(row.category_id)) || row.category_name || 'Despesa não classificada',
    result_nature: row.result_nature || determineResultNature(row.category_name, row.type),
    account_id: 'Caixa Geral',
    counterparty: row.counterparty || null,
    collaborator_id: row.collaborator_id || null,
    collaborator_name: row.collaborator_name || null,
    purpose: row.purpose,
    vehicle_id: row.vehicle_id,
    due_date: row.due_date || row.date,
    due_day: row.due_day,
    is_recurring: row.is_recurring,
    installments_total: row.installments_total,
    installment_number: row.installment_number,
    notes: row.notes,
    origin: row.origin,
    created_by: row.created_by,
    status: row.status,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }));
};

export const calculateInstallments = (
  totalAmount: number,
  count: number,
  startDateStr: string,
  daysIntervals: number[] = [30, 60, 90]
): { number: number; total: number; amount: number; dueDate: string }[] => {
  const baseAmount = Math.floor((totalAmount / count) * 100) / 100;
  const remainder = Math.round((totalAmount - baseAmount * count) * 100) / 100;

  const baseDate = new Date(startDateStr + 'T12:00:00Z');
  const installments = [];

  for (let i = 0; i < count; i++) {
    const isLast = i === count - 1;
    const installmentAmount = isLast ? Math.round((baseAmount + remainder) * 100) / 100 : baseAmount;

    let dueDateStr: string;
    if (daysIntervals && daysIntervals.length >= count) {
      const d = new Date(baseDate);
      d.setDate(d.getDate() + daysIntervals[i]);
      dueDateStr = d.toISOString().split('T')[0];
    } else {
      const d = new Date(baseDate);
      d.setMonth(d.getMonth() + (i + 1));
      dueDateStr = d.toISOString().split('T')[0];
    }

    installments.push({
      number: i + 1,
      total: count,
      amount: installmentAmount,
      dueDate: dueDateStr,
    });
  }

  return installments;
};

export const payPayableAccount = async (
  id: string,
  paymentMethod: string = 'PIX',
  paidAtDate?: string
): Promise<{ success: boolean; data?: FinancialTransaction; error?: string }> => {
  try {
    // 1. Verificar idempotência: se a conta a pagar já está ativa/paga
    const { data: existing } = await supabase
      .from('financial_transactions')
      .select('*')
      .eq('id', id)
      .single();

    if (!existing) {
      return { success: false, error: 'Conta a pagar não encontrada.' };
    }

    if (existing.status === 'ACTIVE' || existing.status === 'PAID') {
      // Já foi paga! Retorna sucesso idempotente sem duplicar
      return { success: true, data: existing as FinancialTransaction };
    }

    const payDate = paidAtDate || new Date().toISOString().split('T')[0];

    // 2. Atualizar a obrigação para ACTIVE (paga)
    const { data: updated, error } = await supabase
      .from('financial_transactions')
      .update({
        status: 'ACTIVE',
        payment_method: paymentMethod,
        date: payDate,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data: updated as FinancialTransaction };
  } catch (err: any) {
    return { success: false, error: err.message || 'Erro ao efetuar pagamento da conta.' };
  }
};

export const findMatchingPayableAccount = async (
  amount?: number | null,
  queryText?: string | null
): Promise<FinancialTransaction | null> => {
  try {
    const payables = await fetchPayableAccounts();
    if (payables.length === 0) return null;

    if (amount && amount > 0) {
      const matchByAmount = payables.find(p => Math.abs(p.amount - amount) < 0.01);
      if (matchByAmount) return matchByAmount;
    }

    if (queryText && queryText.trim()) {
      const q = queryText.toLowerCase().trim();
      const matchByQuery = payables.find(
        p =>
          p.description.toLowerCase().includes(q) ||
          (p.counterparty && p.counterparty.toLowerCase().includes(q)) ||
          (p.category_name && p.category_name.toLowerCase().includes(q))
      );
      if (matchByQuery) return matchByQuery;
    }

    return null;
  } catch {
    return null;
  }
};
