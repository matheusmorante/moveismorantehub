import { z } from 'zod';

const unitPrice = z.number().nonnegative('O preço de venda não pode ser negativo.');
const costPrice = z.number().nonnegative('O preço de custo não pode ser negativo.');
export const serviceFormSchema = z.object({
  description: z.string().trim().min(1, 'A descrição é obrigatória.'),
  unitPrice: unitPrice.default(0),
  costPrice: costPrice.optional(),
  active: z.boolean().default(true),
});

// An incomplete service draft is different from finalizing a catalog service.
export const serviceDraftSchema = z.object({
  description: z.string().optional(),
  unitPrice: unitPrice.optional(), costPrice: costPrice.optional(), active: z.boolean().optional(),
});
export const servicePatchSchema = serviceDraftSchema.extend({
  isDraft: z.boolean().optional(), deleted: z.boolean().optional(),
});
