import { z } from 'zod';

export const orderCompositionSnapshotSchema = z.object({
  groupId: z.string().uuid(),
  productId: z.string().min(1),
  variationId: z.string().optional(),
  description: z.string().trim().min(1),
  code: z.string(),
  orderedQuantity: z.number().int().positive(),
  quantityPerComposition: z.number().positive(),
  componentIndex: z.number().int().nonnegative(),
  componentCount: z.number().int().positive(),
});

export type OrderCompositionSnapshot = z.infer<typeof orderCompositionSnapshotSchema>;
