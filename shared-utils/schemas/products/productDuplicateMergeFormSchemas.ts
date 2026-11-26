import { z } from 'zod';
import { variationFamilyUuidSchema as uuid } from './variationFamilyFormSchemas';

export const duplicateProductMergeSearchSchema = z.object({
  sourceId: uuid,
  query: z.string().trim().min(2, 'Digite pelo menos dois caracteres.').max(100),
});

export const duplicateProductMergeCommandSchema = z.object({
  sourceId: uuid,
  canonicalId: uuid,
});

export const duplicateProductMergeOptionSchema = z.object({
  id: uuid,
  code: z.string().trim().min(1),
  name: z.string().trim().min(1),
  stock: z.coerce.number(),
});

export const duplicateProductMergeAckSchema = z.object({
  success: z.literal(true),
  code: z.literal('products_merged'),
  source_product_id: uuid,
  canonical_product_id: uuid,
  canonical_code: z.string().trim().min(1),
  source_deleted: z.literal(true),
  merged_variation_count: z.number().int().positive(),
  order_items_repointed: z.number().int().nonnegative(),
  inventory_moves_repointed: z.number().int().nonnegative(),
  images_repointed: z.number().int().nonnegative(),
  duplicate_images_removed: z.number().int().nonnegative(),
  categories_repointed: z.number().int().nonnegative(),
  duplicate_categories_removed: z.number().int().nonnegative(),
  analytics_repointed: z.number().int().nonnegative(),
  canonical_stock: z.coerce.number(),
  historical_snapshots_preserved: z.literal(true),
  already_merged: z.boolean().optional(),
});

export class DuplicateProductMergeUnconfirmedError extends Error {
  readonly uncertain = true;

  constructor(message = 'A mesclagem pode ter sido gravada, mas não foi confirmada. Recarregue os produtos antes de repetir.') {
    super(message);
  }
}
