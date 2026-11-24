import { z } from 'zod';
import { variationTargetFormSchema } from './catalogFormSchemas';
import { variationFamilyUuidSchema as uuid } from './variationFamilyFormSchemas';

export const variationMergeCommandSchema = variationTargetFormSchema.safeExtend({ sourceId: uuid, targetId: uuid,
  sourceParentId: uuid.optional(), supplierId: uuid.optional(),
});
export const variationMergeSearchSchema = z.object({ sourceId: uuid, query: z.string().trim().min(2, 'Digite pelo menos dois caracteres.'), supplierId: uuid.optional() });
const nullableText = z.string().nullish();
export const variationMergeOptionSchema = z.object({ id: uuid, name: z.string().trim().min(1), sku: nullableText,
  merged_to_variation_id: uuid.nullable(), product: z.object({ name: nullableText, description: nullableText,
    supplier_id: uuid.nullish(), main_supplier_id: uuid.nullish(),
  }).nullish(),
});
export const variationMergeIdentitySchema = z.object({ id: uuid, product_id: uuid, merged_to_variation_id: uuid.nullable(), active: z.boolean().nullable(), status: z.string().nullable() });
const suppliers = z.array(uuid).refine((value) => new Set(value).size === value.length, 'A confirmação contém fornecedores repetidos.');
export const variationMergeAckSchema = z.object({ transferredSupplierIds: suppliers, canonicalSupplierIds: suppliers });
export class VariationMergeUnconfirmedError extends Error {
  readonly uncertain = true;
  constructor(message = 'A mesclagem pode ter sido gravada, mas não foi confirmada. Consulte as variações e recarregue antes de repetir.') { super(message); }
}
export interface VariationMergeOperationGuard { active: symbol | null; error: string }
