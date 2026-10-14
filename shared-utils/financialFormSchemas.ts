import { z } from 'zod';

const financialFields = {
  description: z.string().trim().min(1, 'Informe a descrição.'),
  amount: z.number({ error: 'Informe um valor válido.' }).positive('Informe um valor maior que zero.'),
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

export const receivableSettlementFormSchema = payableSettlementFormSchema.extend({
  id: z.string().min(1, 'Conta a receber não encontrada.'),
});
