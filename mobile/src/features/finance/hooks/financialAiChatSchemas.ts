import { z } from 'zod';
import { textPromptFormSchema } from '../../../../../shared-utils/assistedFormSchemas';
import { financialIntentDraftFormSchema, financialTransactionFormSchema } from '../../../../../shared-utils/financialFormSchemas';

export const messageFormSchema = textPromptFormSchema.extend({ targetMessageId: z.string().trim().min(1).optional() });
const purposeSchema = z.string().pipe(z.enum(['BUSINESS', 'PERSONAL', 'PERSONAL_PARTNER']));

// Incomplete drafts remain editable; only confirmation requires a realized fact.
export const confirmationFormSchema = financialIntentDraftFormSchema.extend({
  description: z.string().trim().nullish(), supplier: z.string().trim().nullish(),
  paymentMethod: financialTransactionFormSchema.shape.payment_method.refine((value) => !['UNKNOWN', 'UNKNOWN_BY_USER'].includes(value), 'Informe a forma de pagamento.'),
  businessPurpose: purposeSchema.nullish(), purpose: purposeSchema.nullish(),
  categoryName: z.string().trim().nullish(), categoryId: z.string().trim().nullish(),
  vehicleId: z.string().trim().nullish(),
  matchedAccount: z.object({ id: z.string().trim().min(1, 'Conta não identificada.') }).passthrough().nullish(),
}).superRefine((values, ctx) => {
  if (!values.businessPurpose && !values.purpose) ctx.addIssue({ code: 'custom', path: ['businessPurpose'], message: 'Informe a finalidade da movimentação.' });
  const amount = financialTransactionFormSchema.shape.amount.safeParse(values.amount ?? values.totalAmount);
  if (!amount.success) ctx.addIssue({ code: 'custom', path: ['amount'], message: amount.error.issues[0].message });
  if (values.intentType && ['INSTALLMENT', 'PAYABLE_BILL', 'RECURRING'].includes(values.intentType)) ctx.addIssue({ code: 'custom', path: ['intentType'], message: 'Registre apenas fatos realizados; parcelas futuras e recorrências não são suportadas.' });
  if (values.intentType && ['MATCH_EXISTING', 'QUERY_OR_UPDATE'].includes(values.intentType) && !values.matchedAccount) ctx.addIssue({ code: 'custom', path: ['matchedAccount'], message: 'Selecione a conta existente antes de confirmar a movimentação.' });
});

export const singleTransactionFormSchema = financialTransactionFormSchema.extend({ category_name: z.string().trim().nullish(), purpose: purposeSchema.nullish() });
