import { z } from 'zod';
import { inventoryScopeFormSchema } from './operationsFormSchemas';

const count = z.number().nonnegative('A contagem física não pode ser negativa.');
const snapshotItem = z.object({
  productId: z.string().min(1), variationId: z.string().optional(), name: z.string(),
  supplierNames: z.string(), assignedSupplier: z.string(), systemStock: z.number(), unit: z.string(),
  sku: z.string().optional(), code: z.string().optional(), barcode: z.string().optional(), isActive: z.boolean().optional(),
}).passthrough();

export const inventoryAuditItemSchema = snapshotItem.extend({
  id: z.string().min(1), key: z.string().min(1), physicalCount: count.nullable(), countedAt: z.string().optional(),
});
const inventoryAuditSourceItemSchema = inventoryAuditItemSchema.extend({ productId: z.string() }).superRefine((item, context) => {
  if (item.physicalCount !== null && !item.productId.trim()) {
    context.addIssue({ code: 'custom', path: ['productId'], message: 'Vincule o produto dos itens contados antes de concluir.' });
  }
});
export const inventoryAuditReviewQuerySchema = z.object({
  startDate: z.union([z.iso.date(), z.iso.datetime({ offset: true })]),
  items: z.array(inventoryAuditSourceItemSchema),
});
export const inventoryAuditReviewFormSchema = z.object({
  items: z.array(inventoryAuditItemSchema.extend({ physicalCount: count, reconciledExpected: z.number(), difference: z.number() }))
    .min(1, 'Conte pelo menos um item antes de concluir o inventário.'),
}).superRefine((values, context) => {
  const identities = new Set<string>();
  for (const [index, item] of values.items.entries()) {
    if (identities.has(item.id) || item.difference !== item.physicalCount - item.reconciledExpected) {
      context.addIssue({ code: 'custom', path: ['items', index], message: 'Revise os itens e as diferenças antes de concluir o inventário.' });
    }
    identities.add(item.id);
  }
});

export const inventoryAuditScopeSchema = inventoryScopeFormSchema.safeExtend({
  hasStages: z.boolean().optional(), customProductIds: z.array(z.string()).optional(),
  itemsSnapshot: z.array(snapshotItem),
}).passthrough();

/** Empty scopes and uncounted rows remain valid local drafts. */
export const inventoryAuditDraftSchema = z.object({
  id: z.string().min(1), code: z.string().min(1), date: z.string(), name: z.string(),
  responsibleId: z.string(), responsibleName: z.string().optional(), hasStages: z.boolean(),
  scopeType: z.string().optional(), supplierId: z.string().optional(),
  status: z.enum(['in_progress', 'pending_sync']), items: z.array(inventoryAuditItemSchema.extend({ productId: z.string() })),
  scannedLabelIds: z.array(z.string()).optional(), updatedAt: z.string(),
}).passthrough();

export const inventoryAuditCompletionSchema = z.object({
  id: z.string().min(1, 'Inventário sem identificação ou sem contagem.'),
  code: z.string().min(1, 'Inventário sem identificação ou sem contagem.'),
  items: z.array(inventoryAuditSourceItemSchema),
  adjustments: z.array(inventoryAuditItemSchema.extend({
    physicalCount: count, reconciledExpected: z.number(), difference: z.number(),
  })),
}).superRefine((values, context) => {
  if (!values.items.some((item) => item.physicalCount !== null)) context.addIssue({ code: 'custom', path: ['items'], message: 'Inventário sem identificação ou sem contagem.' });
  const seen = new Set<string>();
  for (const [index, adjustment] of values.adjustments.entries()) {
    const source = values.items.find((item) => item.id === adjustment.id);
    if (!source || source.productId !== adjustment.productId || source.variationId !== adjustment.variationId || source.physicalCount !== adjustment.physicalCount
      || adjustment.difference !== adjustment.physicalCount - adjustment.reconciledExpected || seen.has(adjustment.id)) {
      context.addIssue({ code: 'custom', path: ['adjustments', index], message: 'Revise os itens e contagens do inventário antes de concluir.' });
    }
    seen.add(adjustment.id);
  }
  if (new Set(values.items.map((item) => item.id)).size !== values.items.length
    || values.items.some((item) => item.physicalCount !== null && !seen.has(item.id))) {
    context.addIssue({ code: 'custom', path: ['adjustments'], message: 'Inclua todos os itens contados uma única vez na revisão.' });
  }
});
