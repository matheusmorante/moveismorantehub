import { z } from 'zod';
import { bulkNcmFormSchema } from './catalogFormSchemas';

export const ncmSyncFormSchema = z.object({ syncRunId: z.string().min(1, 'Prepare uma prévia antes de aplicar a sincronização.') });
export const ncmProductReviewFormSchema = z.object({
  destinationCode: bulkNcmFormSchema.shape.ncm,
  productIds: z.array(z.string().min(1)).min(1, 'Selecione os produtos para revisar.'),
});
export const ncmCorrelationFormSchema = z.object({
  sourceCode: bulkNcmFormSchema.shape.ncm, destinationCode: bulkNcmFormSchema.shape.ncm,
  relationType: z.enum(['one_to_one', 'one_to_many', 'many_to_one']),
  version: z.string().trim().min(1, 'Informe a versão da correlação.'),
});
