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
  attributes: z.array(z.object({ name: z.string().trim().min(1), values: z.array(z.string().trim().min(1)).min(1), showName: z.boolean() })).min(1, 'Selecione pelo menos um atributo e um valor.'),
});
export const variationTargetFormSchema = z.object({
  sourceId: z.string().min(1, 'Variação de origem não encontrada.'),
  targetId: z.string().min(1, 'Selecione o destino.'),
}).refine((value) => value.sourceId !== value.targetId, { path: ['targetId'], message: 'Selecione um destino diferente da origem.' });
export const variationFamilyFormSchema = z.object({
  sourceId: z.string().min(1), familyId: z.string().min(1, 'Selecione a família de destino.'),
  attributes: z.array(z.object({ name: z.string().trim().min(1), value: z.string().trim().min(1) }).passthrough()),
});
export const inventoryBatchEditFormSchema = z.object({ quantity: z.number().nonnegative(), unitCost: z.number().nonnegative() });
