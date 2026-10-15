import { z } from 'zod';
import { bulkAttributeFormSchema } from './catalogFormSchemas';
import { productVariationDraftSchema } from './productVariationValidation';

export const productConversionFormSchema = bulkAttributeFormSchema.extend({
  product: z.object({
    code: z.string().optional(),
    ...productVariationDraftSchema.pick({ stock: true, unitPrice: true, costPrice: true }).partial().shape,
  }).passthrough(),
});
