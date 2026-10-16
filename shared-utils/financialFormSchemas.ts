import { z } from 'zod';

const financialFields = {
  description: z.string().trim().min(1, 'Informe a descrição.'),
  amount: z.number({ error: 'Informe um valor válido.' }).positive('Informe um valor maior que zero.')
    .refine((value) => Number.isSafeInteger(Math.round(value * 100))
      && Math.abs(value * 100 - Math.round(value * 100)) < 0.000001, 'Informe o valor com até duas casas decimais.'),
};
const financialDate = z.iso.date({ error: 'Informe uma data válida.' });
const paymentStatus = z.enum(['pending', 'paid', 'cancelled', 'overdue']);
const optionalIntentDate = z.union([z.literal(''), financialDate]).nullish();
export const financialIntentDraftFormSchema = z.object({
  intentType: z.enum(['SINGLE_TRANSACTION', 'RECURRING', 'PAYABLE_BILL', 'INSTALLMENT', 'MATCH_EXISTING', 'QUERY_OR_UPDATE']).optional(),
  type: z.enum(['income', 'expense']).nullish(), description: z.string().nullish(),
  amount: z.number().nonnegative().nullish(), totalAmount: z.number().nonnegative().nullish(),
  installmentAmount: z.number().nonnegative().nullish(), installmentsCount: z.number().int().positive().nullish(),
  date: optionalIntentDate, dueDate: optionalIntentDate,
  supplier: z.string().nullish(), counterparty: z.string().nullish(), category: z.string().nullish(), categoryName: z.string().nullish(), categoryId: z.string().nullish(),
  paymentMethod: z.string().nullish(), notes: z.string().nullish(),
  installmentList: z.array(z.object({ number: z.number().int().positive(), amount: z.number().positive(), dueDate: optionalIntentDate })).nullish(),
}).passthrough();
export const financialIntentEditFormSchema = z.object({
  description: financialFields.description, supplier: z.string(), totalAmount: financialFields.amount,
  totalAmountInput: z.string().refine((value) => !value || /^\d+(?:[.,]\d+)?$/.test(value.trim()), 'Informe um valor válido.'),
  category: z.string(), paymentMethod: z.string(), dueDate: z.union([z.literal(''), financialDate]), notes: z.string(),
  installments: z.array(z.object({ number: z.number().int().positive(), amount: z.number().positive(), dueDate: optionalIntentDate })),
});
export const transactionFiltersFormSchema = z.object({ type: z.enum(['income', 'expense', 'all']).optional(), categoryId: z.string().optional(), paymentMethod: z.string().optional(), accountId: z.string().optional(), searchQuery: z.string().optional() }).passthrough();

export const financialTransactionFormSchema = z.object({
  ...financialFields,
  type: z.enum(['income', 'expense']),
  date: financialDate,
  payment_method: z.string().trim().min(1, 'Informe a forma de pagamento.'),
  category_id: z.string().optional(),
  notes: z.string().optional(),
});
export const financialTransactionWriteSchema = financialTransactionFormSchema.extend({
  purpose: z.enum(['BUSINESS', 'PERSONAL']).optional(),
  result_nature: z.enum(['RECEITA', 'DESPESA', 'NAO_AFETA_RESULTADO']).optional(),
  payable_id: z.string().min(1).optional(), receivable_id: z.string().min(1).optional(),
  idempotency_key: z.string().min(1).optional(),
});

export const payableFormSchema = z.object({
  ...financialFields,
  due_date: financialDate,
  status: paymentStatus,
  category_id: z.string().trim().min(1, 'Selecione uma categoria.'),
  supplier_name: z.string(),
  notes: z.string(),
});

export const payableExpenseFormSchema = z.object({
  payable: payableFormSchema,
  expenseType: z.enum(['single', 'installments', 'recurring']),
  installmentsCount: z.number(),
  recurringFrequency: z.enum(['monthly', 'yearly']),
  isEditing: z.boolean(),
}).superRefine((data, context) => {
  if (!data.isEditing && data.expenseType === 'installments'
    && (!Number.isInteger(data.installmentsCount) || data.installmentsCount < 2 || data.installmentsCount > 120)) {
    context.addIssue({ code: 'custom', path: ['installmentsCount'], message: 'Informe de 2 a 120 parcelas inteiras.' });
  }
  if (!data.isEditing && data.expenseType === 'installments'
    && Math.round(data.payable.amount * 100) < data.installmentsCount) {
    context.addIssue({ code: 'custom', path: ['payable', 'amount'], message: 'Cada parcela deve ter pelo menos um centavo.' });
  }
});

// Settlement uses the persisted account, independently from unsaved edits.
export const payableSettlementFormSchema = z.object({
  ...financialFields,
  id: z.string().min(1, 'Conta a pagar não encontrada.'),
  date: financialDate,
  status: paymentStatus,
  category_id: z.string().optional(),
});

export const receivableFormSchema = payableFormSchema.omit({ supplier_name: true }).extend({
  category_id: z.string().optional(),
  customer_name: z.string(),
});
export const payableWriteSchema = payableFormSchema.partial({ category_id: true, supplier_name: true, notes: true }).extend({
  payment_date: financialDate.optional(), recurring_expense_id: z.uuid().optional(),
});
export const receivableWriteSchema = receivableFormSchema.partial({ customer_name: true, notes: true }).extend({
  payment_date: financialDate.optional(), order_id: z.string().optional(),
});

export const receivableSettlementFormSchema = payableSettlementFormSchema.extend({
  id: z.string().min(1, 'Conta a receber não encontrada.'),
});

export const financialSettlementCommandSchema = z.object({
  kind: z.enum(['payable', 'receivable']),
  account: payableSettlementFormSchema,
}).superRefine(({ account }, context) => {
  if (account.status === 'cancelled') context.addIssue({ code: 'custom', path: ['account', 'status'], message: 'Uma conta cancelada não pode ser baixada.' });
});

export const financialSettlementResultSchema = z.object({
  id: z.string().min(1), status: z.literal('paid'), payment_date: financialDate,
  transaction_id: z.string().min(1), already_applied: z.boolean(),
});
export const recurringPayableCommandSchema = z.object({
  request_id: z.uuid(), payable: payableFormSchema,
  frequency: z.enum(['monthly', 'yearly']),
}).superRefine(({ payable }, context) => {
  if (payable.status !== 'pending') context.addIssue({ code: 'custom', path: ['payable', 'status'], message: 'Uma nova recorrência deve estar pendente.' });
});
export const recurringPayableResultSchema = z.object({
  recurring_expense_id: z.uuid(), payable_ids: z.array(z.uuid()).length(12), already_applied: z.boolean(),
});

/** Civil dates do not pass through the browser's UTC offset. */
export function financialToday(now = new Date()) {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}
export function financialMonthDate(date: string, offset: number) {
  const [year, month, day] = financialDate.parse(date).split('-').map(Number);
  const last = new Date(0);
  last.setUTCFullYear(year, month + offset, 0);
  return financialDate.parse(`${String(last.getUTCFullYear()).padStart(4, '0')}-${String(last.getUTCMonth() + 1).padStart(2, '0')}-${String(Math.min(day, last.getUTCDate())).padStart(2, '0')}`);
}
export function buildPayableInstallments(input: z.input<typeof payableExpenseFormSchema>) {
  const { payable, installmentsCount: count } = payableExpenseFormSchema.parse(input);
  const cents = Math.round(payable.amount * 100);
  return Array.from({ length: count }, (_, index) => ({
    ...payable, description: `${payable.description} (Parc. ${index + 1}/${count})`,
    amount: (Math.floor(cents / count) + (index < cents % count ? 1 : 0)) / 100,
    due_date: financialMonthDate(payable.due_date, index),
  }));
}
