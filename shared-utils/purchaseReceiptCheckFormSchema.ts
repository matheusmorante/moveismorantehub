import { z } from 'zod';

export const createPurchaseReceiptCheckFormSchema = (itemKeys: readonly string[]) =>
  z.object({
    invoiceNumber: z.string(),
    invoiceDate: z.string(),
    discrepancyNote: z.string(),
    receivedQuantities: z.record(z.string(), z.number().nonnegative('A quantidade recebida não pode ser negativa.')),
    invoicedQuantities: z.record(z.string(), z.number().nonnegative('A quantidade faturada não pode ser negativa.')),
  }).superRefine((values, context) => {
    const allowed = new Set(itemKeys);
    for (const field of ['receivedQuantities', 'invoicedQuantities'] as const) {
      for (const key of itemKeys) {
        if (!Object.hasOwn(values[field], key)) context.addIssue({ code: 'custom', path: [field, key], message: 'Confira a quantidade de todos os itens do pedido.' });
      }
      for (const key of Object.keys(values[field])) {
        if (!allowed.has(key)) context.addIssue({ code: 'custom', path: [field, key], message: 'A conferência contém um item de outro pedido.' });
      }
    }
  });
