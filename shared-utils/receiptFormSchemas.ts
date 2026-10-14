import { z } from 'zod';
import { purchaseDraftFormSchema, purchaseFormSchema } from './purchaseFormSchemas';
import { normalizeFiscalIdentifier } from './fiscalIdentifiers';
import { validateNfeAccessKey } from './nfeAccessKeyValidation';

export const receiptDraftFormSchema = z.object({
  supplierId: z.string(),
  receiptDate: z.string().refine((value) => !value || !Number.isNaN(Date.parse(value)), 'Informe uma data de recebimento válida.'),
  items: purchaseDraftFormSchema.shape.items,
  totalValue: z.number().nonnegative(),
  fiscalKey: z.string().transform(normalizeFiscalIdentifier).refine((value) => !value || validateNfeAccessKey(value).valid, 'Informe uma chave NF-e válida com 44 caracteres e dígito verificador.'),
  ipiPercent: z.number().nonnegative(), freightPercent: z.number().nonnegative(),
  invoiceNumber: z.string().default(''), invoiceDate: z.string().refine((value) => !value || !Number.isNaN(Date.parse(value)), 'Informe uma data de nota válida.').default(''),
  attachments: z.array(z.string()).default([]), observations: z.array(z.string()).default([]),
  nonFiscalDiscountMode: z.enum(['percent', 'fixed']).default('percent'), nonFiscalDiscountValue: z.number().nonnegative().default(0),
  nonFiscalFreightMode: z.enum(['percent', 'fixed']).default('percent'), nonFiscalFreightValue: z.number().nonnegative().default(0),
  nonFiscalOtherExpensesMode: z.enum(['percent', 'fixed']).default('percent'), nonFiscalOtherExpensesValue: z.number().nonnegative().default(0),
  fiscalIpi: z.number().nonnegative().default(0), fiscalFreight: z.number().nonnegative().default(0), fiscalDiscount: z.number().nonnegative().default(0), fiscalOtherExpenses: z.number().nonnegative().default(0),
});
export const receiptFormSchema = receiptDraftFormSchema.extend({
  supplierId: z.string().min(1, 'Selecione o fornecedor para continuar.'),
  items: purchaseFormSchema.shape.items,
});
