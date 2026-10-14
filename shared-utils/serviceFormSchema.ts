import { z } from 'zod';

export const serviceFormSchema = z.object({
  description: z.string().trim().min(1, 'A descrição é obrigatória.'),
  unitPrice: z.number().nonnegative('O preço de venda não pode ser negativo.').default(0),
  costPrice: z.number().nonnegative('O preço de custo não pode ser negativo.').optional(),
  active: z.boolean().default(true),
}).passthrough();
