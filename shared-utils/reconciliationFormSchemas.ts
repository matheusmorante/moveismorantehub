import { z } from 'zod';
import { bulkAttributeFormSchema, bulkNcmFormSchema, catalogSelectionFormSchema } from './catalogFormSchemas';

const id = catalogSelectionFormSchema.shape.id;
const productIds = z.array(id).min(1, 'Selecione produtos para corrigir.').refine((ids) => new Set(ids).size === ids.length, 'A seleção contém produtos repetidos.');
const targets = z.object({ productIds });
export const reconciliationSupplierFormSchema = targets.extend({ operation: z.literal('supplier'), supplierId: id, replaceExisting: z.boolean() });
export const reconciliationCategoryFormSchema = targets.extend({ operation: z.literal('category'), categoryId: id });
export const reconciliationNcmFormSchema = targets.extend({ operation: z.literal('ncm'), ...bulkNcmFormSchema.shape });
export const reconciliationAttributeFormSchema = targets.extend({ operation: z.literal('attribute'), ...bulkAttributeFormSchema.shape });
export const reconciliationBatchFormSchema = z.discriminatedUnion('operation', [
  reconciliationSupplierFormSchema, reconciliationCategoryFormSchema, reconciliationNcmFormSchema, reconciliationAttributeFormSchema,
]);
export type ReconciliationBatchInput = z.input<typeof reconciliationBatchFormSchema>;
export type ReconciliationBatchValues = z.output<typeof reconciliationBatchFormSchema>;
export const reconciliationAttributeValueSchema = z.object({
  name: z.string().trim().min(1, 'Informe o nome do atributo.'), value: z.string(), showName: z.boolean().optional(),
}).passthrough();
export const reconciliationProductFormSchema = z.object({
  productUpdates: z.object({ id, mainSupplierId: id.optional(), categoryId: id.optional(), ncm: bulkNcmFormSchema.shape.ncm.optional(),
    price: z.number().nonnegative('O preço não pode ser negativo.').optional() }),
  variationUpdates: z.array(z.object({ id, price: z.number().nonnegative('O preço da variação não pode ser negativo.').optional(),
    attributes: z.array(reconciliationAttributeValueSchema).optional() })).default([])
    .refine((variations) => new Set(variations.map((variation) => variation.id)).size === variations.length, 'A lista contém uma variação repetida.'),
});
export type ReconciliationProductValues = z.output<typeof reconciliationProductFormSchema>;
export type ReconciliationResult = { success: boolean; updated?: number; error?: string; uncertain?: boolean };
export type ReconciliationConfirmation = ReconciliationResult | boolean | void;
export const reconciliationQueryFormSchema = z.object({
  page: z.number().int().positive(), pageSize: z.number().int().positive(),
  filters: z.object({
    pendencyType: z.enum(['all', 'supplier', 'category', 'ncm', 'price', 'name', 'attributes', 'category_attribute', 'incomplete_attribute', 'variation_price']).optional(),
    categoryId: id.optional(), supplierId: id.optional(), search: z.string().trim().optional(), onlyCritical: z.boolean().optional(),
  }),
});
export const reconciliationSupplierSearchSchema = z.object({
  search: z.string().transform((value) => value.replace(/["\\]/g, '').trim()).pipe(z.string().min(2, 'Digite pelo menos dois caracteres.')),
});
export const reconciliationSupplierResultsSchema = z.array(z.object({
  id, full_name: z.string().nullable().optional(), social_name: z.string().nullable().optional(),
  nickname: z.string().nullable().optional(), cpf_cnpj: z.string().nullable().optional(),
}));

export type ReconciliationAvailableAttribute = { name: string; dataType?: 'list' | 'integer' | 'decimal' | 'text' | 'boolean' | 'measure' };
export const createReconciliationAttributeChoiceSchema = (attributes: readonly ReconciliationAvailableAttribute[]) => bulkAttributeFormSchema.superRefine((data, ctx) => {
  const attribute = attributes.find((candidate) => candidate.name.trim() === data.name);
  if (!attribute) { ctx.addIssue({ code: 'custom', path: ['name'], message: 'Selecione um atributo disponível para estes produtos.' }); return; }
  if (attribute.dataType === 'boolean' && !['Sim', 'Não'].includes(data.value)) ctx.addIssue({ code: 'custom', path: ['value'], message: 'Selecione Sim ou Não.' });
  if (['integer', 'decimal', 'measure'].includes(attribute.dataType || '')) {
    const value = Number(data.value.replace(',', '.'));
    if (!Number.isFinite(value) || (attribute.dataType === 'integer' && !Number.isInteger(value))) ctx.addIssue({ code: 'custom', path: ['value'], message: attribute.dataType === 'integer' ? 'Informe um número inteiro.' : 'Informe um número válido.' });
  }
});

export const createReconciliationBatchFormSchema = (options: {
  attributes?: readonly ReconciliationAvailableAttribute[];
  supplierIds?: readonly string[];
  categoryIds?: readonly string[];
}) => reconciliationBatchFormSchema.superRefine((data, ctx) => {
  if (data.operation === 'supplier' && options.supplierIds && !options.supplierIds.includes(data.supplierId)) {
    ctx.addIssue({ code: 'custom', path: ['supplierId'], message: 'Selecione um fornecedor da busca atual.' });
  }
  if (data.operation === 'category' && options.categoryIds && !options.categoryIds.includes(data.categoryId)) {
    ctx.addIssue({ code: 'custom', path: ['categoryId'], message: 'Selecione uma categoria disponível.' });
  }
  if (data.operation === 'attribute') {
    const result = createReconciliationAttributeChoiceSchema(options.attributes || []).safeParse({
      name: data.name,
      value: data.value,
    });
    if (!result.success) {
      result.error.issues.forEach((issue) => {
        ctx.addIssue({ code: 'custom', path: issue.path, message: issue.message });
      });
    }
  }
});

/** Inline reconciliation may remain incomplete; provided typed values must be valid. */
export const createReconciliationProductFormSchema = (attributes: readonly ReconciliationAvailableAttribute[]) => reconciliationProductFormSchema.superRefine((data, ctx) => {
  data.variationUpdates.forEach((variation, variationIndex) => variation.attributes?.forEach((attribute, attributeIndex) => {
    if (!attribute.value.trim()) return;
    const definition = attributes.find((candidate) => candidate.name.trim().toLowerCase() === attribute.name.toLowerCase());
    if (!definition) return;
    const result = createReconciliationAttributeChoiceSchema([definition]).safeParse({ name: definition.name, value: attribute.value });
    if (!result.success) ctx.addIssue({ code: 'custom', path: ['variationUpdates', variationIndex, 'attributes', attributeIndex, 'value'], message: result.error.issues[0].message });
  }));
});
