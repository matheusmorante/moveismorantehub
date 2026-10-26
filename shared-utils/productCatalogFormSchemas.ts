import { z } from 'zod';

const productCatalogItemSchema = z.object({
  productId: z.string().uuid('Produto inválido.'),
  variationId: z.string().uuid('Variação inválida.').optional(),
  name: z.string().trim().min(1, 'Produto sem nome.').max(180),
  variationName: z.string().trim().max(180).optional(),
  slug: z.string().trim().max(220).optional(),
  price: z.number().finite().nonnegative(),
  imageUrl: z.string().trim().max(2000).optional(),
  description: z.string().trim().max(2000).optional(),
});

export const productCatalogFiltersSchema = z.object({
  categoryId: z.string().uuid().nullable(),
  search: z.string().trim().max(100),
  brand: z.string().trim().max(120),
});
export type ProductCatalogFiltersInput = z.infer<typeof productCatalogFiltersSchema>;

const productCatalogScopeSchema = z.object({
  selectionMode: z.literal('all_matching'),
  filters: productCatalogFiltersSchema,
  categoryName: z.string().trim().max(120),
  total: z.number().int().min(1),
  excludedProductIds: z.array(z.string().uuid()).max(100),
});

export const productCatalogDeliveryModeSchema = z.enum(['link', 'native']).default('link');

export const productCatalogPrepareSchema = z.object({
  items: z.array(productCatalogItemSchema).max(500),
  bulkScope: productCatalogScopeSchema.nullable(),
  hidePrices: z.boolean(),
  deliveryMode: productCatalogDeliveryModeSchema,
}).refine((selection) => selection.items.length > 0 || selection.bulkScope !== null, {
  message: 'Selecione ao menos um produto ou uma lista do catálogo.',
  path: ['items'],
}).refine((selection) => new Set(selection.items.map((item) => `${item.productId}:${item.variationId || ''}`)).size === selection.items.length, {
  message: 'Remova os produtos repetidos da seleção.',
  path: ['items'],
});

export type ProductCatalogPrepareInput = z.infer<typeof productCatalogPrepareSchema>;

export const productCatalogSendSelectionSchema = z.object({
  items: z.array(z.object({
    productId: z.string().uuid('Produto inválido.'),
    variationId: z.string().uuid('Variação inválida.').optional(),
  })).max(50),
  bulkScope: z.object({
    selectionMode: z.literal('all_matching'),
    filters: productCatalogFiltersSchema,
    excludedProductIds: z.array(z.string().uuid()).max(100),
  }).nullable(),
  hidePrices: z.boolean(),
  deliveryMode: productCatalogDeliveryModeSchema,
}).refine((selection) => selection.items.length > 0 || selection.bulkScope !== null, {
  message: 'Selecione ao menos um produto ou uma lista do catálogo.',
  path: ['items'],
}).refine((selection) => new Set(selection.items.map((item) => `${item.productId}:${item.variationId || ''}`)).size === selection.items.length, {
  message: 'Remova os produtos repetidos da seleção.',
  path: ['items'],
});

export type ProductCatalogSendSelection = z.infer<typeof productCatalogSendSelectionSchema>;
