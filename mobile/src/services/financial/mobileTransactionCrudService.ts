import { supabase } from '../supabaseClient';
import { FinancialTransaction, TransactionFilterOptions } from './mobileFinanceTypes';
import { fetchFinancialCategories, determineResultNature } from './mobileCategoryService';

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
  if (payload.amount === null || payload.amount === undefined) {
    return { success: false, error: 'O valor da movimentação não foi informado.' };
  }
  if (payload.amount <= 0) {
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
    payment_method: payload.payment_method || null,
    category_id: payload.category_id || null,
    category_name: payload.category_name || null,
    result_nature: resultNature,
    counterparty: payload.counterparty || null,
    collaborator_id: payload.collaborator_id || null,
    collaborator_name: payload.collaborator_name || null,
    purpose: payload.purpose || null,
    vehicle_id: payload.vehicle_id || null,
    due_date: payload.due_date || null,
    due_day: payload.due_day || null,
    is_recurring: payload.is_recurring || false,
    installments_total: payload.installments_total || null,
    idempotency_key: (payload as any).idempotency_key || null,
    origin: payload.origin || 'MANUAL',
    created_by: payload.created_by || 'Operador',
    status: payload.status || 'ACTIVE',
  };

  let insertRes = await supabase
    .from('financial_transactions')
    .insert([fullRecord])
    .select()
    .single();

  if (insertRes.error && insertRes.error.message?.includes('column')) {
    const basicRecord: any = {
      type: fullRecord.type,
      amount: fullRecord.amount,
      date: fullRecord.date,
      description: fullRecord.description,
      payment_method: fullRecord.payment_method,
      category_id: fullRecord.category_id,
      notes: fullRecord.notes || (fullRecord.category_name ? `[${fullRecord.category_name}]` : null),
    };
    if (fullRecord.idempotency_key) {
      basicRecord.idempotency_key = fullRecord.idempotency_key;
    }

    insertRes = await supabase
      .from('financial_transactions')
      .insert([basicRecord])
      .select()
      .single();
  }

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

export const updateFinancialTransaction = async (
  id: string,
  payload: Partial<FinancialTransaction>
): Promise<{ success: boolean; error?: string }> => {
  const updatePayload: any = {
    updated_at: new Date().toISOString(),
  };

  if (payload.type !== undefined) updatePayload.type = payload.type;
  if (payload.amount !== undefined) updatePayload.amount = payload.amount;
  if (payload.date !== undefined) updatePayload.date = payload.date;
  if (payload.description !== undefined) updatePayload.description = payload.description.trim();
  if (payload.payment_method !== undefined) updatePayload.payment_method = payload.payment_method;
  if (payload.category_id !== undefined) updatePayload.category_id = payload.category_id || null;
  if (payload.notes !== undefined) updatePayload.notes = payload.notes || null;

  const fullUpdate = {
    ...updatePayload,
    category_name: payload.category_name || null,
    result_nature: payload.result_nature || null,
    purpose: payload.purpose || null,
    vehicle_id: payload.vehicle_id || null,
    collaborator_id: payload.collaborator_id || null,
    collaborator_name: payload.collaborator_name || null,
  };

  let updateRes = await supabase
    .from('financial_transactions')
    .update(fullUpdate)
    .eq('id', id);

  if (updateRes.error && updateRes.error.message?.includes('column')) {
    updateRes = await supabase
      .from('financial_transactions')
      .update(updatePayload)
      .eq('id', id);
  }

  return updateRes.error ? { success: false, error: updateRes.error.message } : { success: true };
};

export const deleteFinancialTransaction = async (
  id: string
): Promise<{ success: boolean; error?: string }> => {
  const { error } = await supabase
    .from('financial_transactions')
    .delete()
    .eq('id', id);

  return error ? { success: false, error: error.message } : { success: true };
};
