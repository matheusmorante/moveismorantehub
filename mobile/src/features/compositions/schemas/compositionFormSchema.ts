import { z } from 'zod';

export const mobileCompositionFormSchema = z.object({
  data: z.object({
    id: z.string().optional(),
    name: z.string().trim().min(1, 'O nome da composição é obrigatório.'),
    sku: z.string().optional(),
    description: z.string().optional(),
    active: z.boolean().optional(),
    catalog_published: z.boolean().optional(),
    pricing_mode: z.enum(['sum', 'fixed', 'discount']),
    manual_price: z
      .number()
      .nonnegative('Informe um preço válido.')
      .nullish()
      .transform((value) => value ?? undefined),
  }).passthrough(),
  items: z
    .array(
      z.object({
        product_id: z.string().min(1, 'Selecione um produto real.'),
        variation_id: z.string().optional(),
        quantity: z.number().positive('A quantidade deve ser maior que zero.'),
      }).passthrough()
    )
    .min(1, 'Adicione pelo menos um produto real à composição.'),
});

export type MobileCompositionFormValues = z.infer<typeof mobileCompositionFormSchema>;
