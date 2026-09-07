import { supabase } from '../supabaseClient';
import { FinancialTransaction } from './mobileFinanceTypes';
import { fetchFinancialCategories, determineResultNature } from './mobileCategoryService';

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
    const { data: existing } = await supabase
      .from('financial_transactions')
      .select('*')
      .eq('id', id)
      .single();

    if (!existing) {
      return { success: false, error: 'Conta a pagar não encontrada.' };
    }

    if (existing.status === 'ACTIVE' || existing.status === 'PAID') {
      return { success: true, data: existing as FinancialTransaction };
    }

    const payDate = paidAtDate || new Date().toISOString().split('T')[0];

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
