import { z } from 'zod';
import { purchaseDraftFormSchema, purchaseFormSchema } from './purchaseFormSchemas';
import { ACCESS_KEY_PATTERN, normalizeFiscalIdentifier } from './fiscalIdentifiers';

export const receiptDraftFormSchema = z.object({
  supplierId: z.string(),
  receiptDate: z.string().refine((value) => !value || !Number.isNaN(Date.parse(value)), 'Informe uma data de recebimento válida.'),
  items: purchaseDraftFormSchema.shape.items,
  totalValue: z.number().nonnegative(),
  fiscalKey: z.string().refine((value) => !value || ACCESS_KEY_PATTERN.test(normalizeFiscalIdentifier(value)), 'Informe uma chave fiscal válida com 44 caracteres.'),
  ipiPercent: z.number().nonnegative(), freightPercent: z.number().nonnegative(),
});
export const receiptFormSchema = receiptDraftFormSchema.extend({
  supplierId: z.string().min(1, 'Selecione o fornecedor para continuar.'),
  items: purchaseFormSchema.shape.items,
});
