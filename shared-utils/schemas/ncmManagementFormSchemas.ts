import { z } from 'zod';
import { bulkNcmFormSchema } from './catalogFormSchemas';
export const ncmCatalogQueryFormSchema = z.object({
  search: z.string(), page: z.number().int().nonnegative(),
  filter: z.enum(['all', 'vigentes', 'encerrados', 'alterados', 'com_produtos', 'revisar', 'futuros']),
  storeFilter: z.enum(['active', 'inactive', 'all']),
});
export const ncmStoreActivationFormSchema = z.object({ code: bulkNcmFormSchema.shape.ncm, active: z.boolean() });

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
