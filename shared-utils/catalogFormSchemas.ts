import { z } from 'zod';

export const catalogNameFormSchema = z.object({
  name: z.string().refine((value) => Boolean(value.trim()), 'Informe o nome.'),
});
export const categoryEnvironmentFormSchema = z.object({
  name: z.string().trim().min(1, 'Informe o nome.'),
  slug: z.string().trim().min(1, 'Informe o endereço da categoria.'),
  type: z.string().refine((value) => ['category', 'environment'].includes(value), 'Selecione o tipo.'),
  linkedIds: z.array(z.string()),
});

export const productReferenceFormSchema = z.object({
  masterName: z.string().refine((value) => Boolean(value.trim()), 'Selecione o produto principal.'),
  referenceName: z.string().refine((value) => Boolean(value.trim()), 'Informe a referência.'),
});
export const catalogSelectionFormSchema = z.object({ id: z.string().trim().min(1, 'Selecione um cadastro.') });
export const bulkNcmFormSchema = z.object({ ncm: z.string().transform((value) => value.trim().replace(/[.\s]/g, '')).pipe(z.string().regex(/^\d{8}$/, 'Informe um NCM válido com 8 dígitos.')) });
export const bulkAttributeFormSchema = z.object({
  name: z.string().trim().min(1, 'Selecione o atributo.'),
  value: z.string().trim().min(1, 'Informe o valor do atributo.'),
});
export const cartesianVariationFormSchema = z.object({
  attributes: z.array(z.object({ name: z.string().trim().min(1, 'Selecione o atributo de cada linha.'), values: z.array(z.string().trim().min(1)).min(1, 'Selecione um valor de cada atributo.'), showName: z.boolean() })).min(1, 'Selecione pelo menos um atributo e um valor.'),
});
export const variationTargetFormSchema = z.object({
  sourceId: z.string().min(1, 'Variação de origem não encontrada.'),
  targetId: z.string().min(1, 'Selecione o destino.'),
}).refine((value) => value.sourceId !== value.targetId, { path: ['targetId'], message: 'Selecione um destino diferente da origem.' });
export const variationFamilyFormSchema = z.object({
  sourceId: z.string().trim().min(1, 'Variação de origem não encontrada.'), familyId: z.string().trim().min(1, 'Selecione a família de destino.'),
  attributes: z.array(z.object({ name: z.string().trim().min(1, 'Informe o atributo.'), value: z.string().trim().min(1, 'Informe o valor do atributo.'), showName: z.boolean().optional() }).passthrough()).min(1, 'Informe pelo menos um atributo da variação.'),
}).refine((values) => new Set(values.attributes.map((attribute) => attribute.name.toLocaleLowerCase('pt-BR'))).size === values.attributes.length,
  { path: ['attributes'], message: 'Não repita o mesmo atributo.' });
const storefrontFilterFields = z.object({
  envs: z.array(z.string()), cats: z.array(z.string()), search: z.string(), type: z.string(),
  minPrice: z.number().nonnegative(), maxPrice: z.number().nonnegative(), sortBy: z.enum(['newest', 'price-asc', 'price-desc']),
});
export const storefrontFiltersFormSchema = storefrontFilterFields.refine((values) => values.minPrice <= values.maxPrice, { path: ['maxPrice'], message: 'O preço máximo deve ser igual ou maior que o mínimo.' });
export const storefrontFilterChangeFormSchema = storefrontFilterFields.partial().refine((values) => values.minPrice === undefined || values.maxPrice === undefined || values.minPrice <= values.maxPrice, { path: ['maxPrice'], message: 'O preço máximo deve ser igual ou maior que o mínimo.' });
export const inventoryBatchEditFormSchema = z.object({ quantity: z.number().nonnegative('Informe uma quantidade igual ou maior que zero.'), unitCost: z.number().nonnegative('Informe um custo igual ou maior que zero.') });
export const inventoryBatchEditCommandFormSchema = inventoryBatchEditFormSchema.extend({
  moveId: z.string().trim().min(1, 'Lote não identificado.'), productId: z.string().trim().min(1, 'Produto do lote não identificado.'),
  previousQuantity: z.number().nonnegative(), previousUnitCost: z.number().nonnegative(),
});
export const priceHistoryQueryFormSchema = z.object({
  productId: z.string().trim().min(1, 'Produto não identificado.').optional(), tab: z.enum(['prices', 'batches']),
});
