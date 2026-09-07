import { supabase } from '../supabaseClient';
import { FinancialTransaction, ConfirmDraftResult } from './mobileFinanceTypes';
import { createFinancialTransaction } from './mobileTransactionCrudService';
import { payPayableAccount } from './mobilePayablesService';

export const confirmFinancialDraft = async (
  draft: any,
  idempotencyKey?: string,
  userName: string = 'Operador'
): Promise<ConfirmDraftResult> => {
  try {
    const todayStr = new Date().toISOString().split('T')[0];

    const blockedIntentTypes = ['INSTALLMENT', 'PAYABLE_BILL', 'RECURRING'];
    if (draft.intentType && blockedIntentTypes.includes(draft.intentType)) {
      return {
        success: false,
        error: 'O Assistente Financeiro registra apenas fatos realizados. Parcelamentos, boletos futuros e recorrências não são suportados.',
      };
    }

    const rawPaymentMethod = String(draft.paymentMethod || draft.payment_method || '').trim();
    if (!rawPaymentMethod || rawPaymentMethod === 'UNKNOWN' || rawPaymentMethod === 'UNKNOWN_BY_USER') {
      const isIncome = draft.type === 'income';
      return {
        success: false,
        error: isIncome
          ? 'Forma de recebimento é obrigatória para registrar a movimentação.'
          : 'Forma de pagamento é obrigatória para registrar a movimentação.',
      };
    }

    const rawPurpose = draft.businessPurpose ?? draft.purpose ?? null;
    if (!rawPurpose || rawPurpose === 'UNKNOWN' || rawPurpose === 'UNKNOWN_BY_USER') {
      return {
        success: false,
        error: 'Para qual finalidade foi essa despesa? (Empresa ou pessoal)',
      };
    }

    const rawAmount = draft.amount ?? draft.totalAmount ?? null;
    if (rawAmount === null || rawAmount === undefined) {
      return { success: false, error: 'O valor da movimentação não foi informado.' };
    }
    if (rawAmount <= 0) {
      return { success: false, error: 'O valor da movimentação deve ser maior que zero.' };
    }

    if ((draft.intentType === 'QUERY_OR_UPDATE' || draft.intentType === 'MATCH_EXISTING') && draft.matchedAccount) {
      const res = await payPayableAccount(
        draft.matchedAccount.id,
        rawPaymentMethod,
        draft.date || todayStr
      );
      if (!res.success) return { success: false, error: res.error };
      return {
        success: true,
        recordId: res.data?.id || draft.matchedAccount.id,
        transactionIds: [res.data?.id || draft.matchedAccount.id],
      };
    }

    const insertPayload: Partial<FinancialTransaction> & { idempotency_key?: string | null } = {
      type: draft.type || 'expense',
      amount: rawAmount,
      description: (draft.description || draft.supplier || 'Lançamento via IA').trim(),
      category_id: draft.categoryId || null,
      category_name: draft.categoryName || null,
      payment_method: rawPaymentMethod,
      purpose: rawPurpose,
      vehicle_id: draft.vehicleId || null,
      counterparty: draft.supplier || draft.counterparty || null,
      due_date: null,
      due_day: null,
      is_recurring: false,
      installments_total: null,
      origin: 'AI_ASSISTANT',
      created_by: userName,
      date: draft.date || todayStr,
      status: 'ACTIVE',
      notes: idempotencyKey ? `IDEMPOTENCY_${idempotencyKey}` : null,
      idempotency_key: idempotencyKey || null,
    };

    const res = await createFinancialTransaction(insertPayload);

    if (!res.success) {
      if ((res as any).pgCode === '23505' || (res.error || '').includes('duplicate key') || (res.error || '').includes('unique')) {
        if (idempotencyKey) {
          const { data: existing } = await supabase
            .from('financial_transactions')
            .select('id')
            .eq('idempotency_key', idempotencyKey)
            .limit(1);
          if (existing && existing.length > 0) {
            return { success: true, recordId: existing[0].id, transactionIds: [existing[0].id] };
          }
        }
        return { success: true, recordId: undefined, transactionIds: [] };
      }
      return { success: false, error: res.error };
    }

    return {
      success: true,
      recordId: res.data?.id,
      transactionIds: res.data?.id ? [res.data.id] : [],
    };
  } catch (err: any) {
    return { success: false, error: err.message || 'Erro inesperado ao confirmar rascunho.' };
  }
};
