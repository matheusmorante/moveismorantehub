import { z } from 'zod';
import { inboundInvoiceFormSchema } from './inboundInvoiceFormSchema';
import { quickRegisterSelectionFormSchema } from './operationsFormSchemas';

const identifier = z.string().trim().min(1, 'Selecione um cadastro válido.');
export const inboundQuickRegisterItemSchema = z.object({
  productDescription: z.string().trim().min(1, 'Informe a descrição do item da nota.'),
  productCode: z.string().trim().optional(), unit: z.string().trim().optional(),
  ncm: z.string().trim().optional(), quantity: z.number().positive('A quantidade do item é inválida.'),
  unitCost: z.number().nonnegative('O custo do item é inválido.'),
  finalCost: z.number().nonnegative('O custo final do item é inválido.').optional(),
});
export function createInboundQuickRegisterSchema(itemNumbers: readonly number[]) {
  return z.object({
    itemNumber: z.number().int().positive().refine((value) => itemNumbers.includes(value), 'O item não pertence à nota de entrada atual.'),
    supplierId: identifier,
    item: inboundQuickRegisterItemSchema,
    selection: quickRegisterSelectionFormSchema,
  });
}
const markup = z.string().transform((value) => value.trim() ? Number(value.replace(',', '.')) : undefined)
  .pipe(z.number().nonnegative('Informe um acréscimo válido sobre o custo final.').optional());

export function createInboundProductPreparationSchema(itemNumbers: readonly number[], markupRequired = false) {
  return z.object({
    itemNumber: z.number().int().positive().refine((value) => itemNumbers.includes(value), 'O item não pertence à nota de entrada atual.'),
    supplierId: identifier,
    markup,
    finalCost: z.number().nonnegative('O custo final do item é inválido.'),
    quantity: z.number().positive('A quantidade do item é inválida.'),
  }).superRefine((value, context) => {
    if (markupRequired && value.markup === undefined) context.addIssue({ code: 'custom', path: ['markup'], message: 'Informe o acréscimo para cadastrar a nova variação.' });
    if (value.markup !== undefined && !Number.isFinite(value.finalCost * (1 + value.markup / 100))) {
      context.addIssue({ code: 'custom', path: ['markup'], message: 'O acréscimo informado resulta em um preço inválido.' });
    }
  });
}

export function createInboundFamilyVariationSchema(itemNumbers: readonly number[]) {
  return createInboundProductPreparationSchema(itemNumbers, true).safeExtend({
    productId: identifier, normalizedParentName: z.string(),
  });
}

export function createInboundProductPreparationCommandSchema(itemNumbers: readonly number[]) {
  return createInboundProductPreparationSchema(itemNumbers).safeExtend({
    item: inboundInvoiceFormSchema.shape.items.element.extend({
      productDescription: z.string().trim().min(1, 'Informe a descrição do item da nota.'),
      productCode: z.string().trim(), unit: z.string().trim(), cest: z.string().optional(),
    }).nullable().refine((value) => value !== null, 'Selecione o item da nota.').transform((value) => value!),
  }).superRefine((value, ctx) => {
    if (value.item.itemNumber !== value.itemNumber || value.item.quantity !== value.quantity) {
      ctx.addIssue({ code: 'custom', path: ['item'], message: 'O item da nota mudou. Reabra a preparação.' });
    }
  });
}
export type InboundProductPreparationCommand = z.output<ReturnType<typeof createInboundProductPreparationCommandSchema>>;
export const inboundItemClassificationSchema = z.object({
  decision: z.enum(['EXISTING_VARIATION', 'NEW_VARIATION_OF_EXISTING_PRODUCT', 'NEW_PRODUCT', 'UNSURE']),
  matchedProductId: z.string().nullable(), matchedVariationId: z.string().nullable(), normalizedParentName: z.string(),
  extractedAttributes: z.object({ color: z.string().nullable(), measure: z.string().nullable(), material: z.string().nullable() }),
  confidence: z.number().min(0).max(1), reasons: z.array(z.string()),
});
export function createInboundClassificationCommandSchema(itemNumbers: readonly number[]) {
  return createInboundProductPreparationCommandSchema(itemNumbers).safeExtend({
    intent: z.enum(['existing', 'family', 'independent']), classification: inboundItemClassificationSchema.optional(),
  }).superRefine((values, ctx) => {
    const expected = values.intent === 'existing' ? 'EXISTING_VARIATION' : 'NEW_VARIATION_OF_EXISTING_PRODUCT';
    if (values.intent !== 'independent' && (values.classification?.decision !== expected || !values.classification?.matchedProductId?.trim())) {
      ctx.addIssue({ code: 'custom', path: ['classification'], message: 'A sugestão de vínculo mudou. Analise o item novamente.' });
    }
    if (values.intent === 'family') {
      if (values.markup === undefined) ctx.addIssue({ code: 'custom', path: ['markup'], message: 'Informe o acréscimo para cadastrar a nova variação.' });
      if (!values.item.productCode) ctx.addIssue({ code: 'custom', path: ['item', 'productCode'], message: 'O item não possui código do fornecedor para vincular.' });
    }
  });
}
export const inboundProductTitleSchema = z.object({ title: z.string().trim().min(1, 'A preparação não retornou um nome válido para o produto.') });

export function createInboundProductLinkSchema(itemNumbers: readonly number[]) {
  return z.object({
    itemNumber: z.number().int().positive().refine((value) => itemNumbers.includes(value), 'O item não pertence à nota de entrada atual.'),
    productId: identifier,
    variationId: identifier.optional(),
    supplierId: identifier.optional(),
    linkedProductCode: z.string().optional(),
    productErpName: z.string().optional(),
  });
}

export function createInboundCreatedProductLinkSchema(itemNumbers: readonly number[]) {
  return createInboundProductLinkSchema(itemNumbers).extend({
    supplierId: identifier,
    supplierProductCode: z.string().trim().min(1, 'O item não possui código do fornecedor para vincular.'),
    supplierDescription: z.string().trim().min(1, 'O item não possui descrição para vincular.'),
  });
}

/** Only editable mapping fields are checked; original NF XML/metadata are preserved. */
export const inboundInvoiceMappingFormSchema = z.object({
  id: identifier, supplierId: identifier.optional(),
  items: z.array(z.object({
    itemNumber: z.number().int().positive(), matchedProductId: identifier.optional(), matchedVariationId: identifier.optional(),
    linkedProductCode: z.string().optional(), productErpName: z.string().optional(),
    ncm: z.string().transform((value) => value.trim().replace(/[.\s]/g, '')).pipe(z.string().regex(/^(\d{8})?$/, 'Informe um NCM válido com 8 dígitos.')).optional(),
    sellingPrice: z.number().nonnegative('Informe um preço válido.').optional(),
    linkMode: z.enum(['single', 'composition']).optional(),
    compositionLinks: z.array(z.object({
      id: identifier, productId: identifier, variationId: identifier.optional(), quantityMultiplier: z.number().positive(),
      sellingPrice: z.number().nonnegative().optional(), apportionedCost: z.number().nonnegative().optional(),
    }).passthrough()).optional(),
  }).passthrough()),
}).passthrough().superRefine((value, ctx) => {
  if (new Set(value.items.map((item) => item.itemNumber)).size !== value.items.length) ctx.addIssue({ code: 'custom', path: ['items'], message: 'Não repita o mesmo item da nota.' });
  value.items.forEach((item, index) => {
    if ((item.matchedProductId || item.compositionLinks?.length) && !value.supplierId) ctx.addIssue({ code: 'custom', path: ['supplierId'], message: 'Selecione o fornecedor antes de vincular produtos.' });
    if (item.matchedVariationId && !item.matchedProductId) ctx.addIssue({ code: 'custom', path: ['items', index, 'matchedProductId'], message: 'Selecione o produto da variação.' });
  });
});
export const mobileInboundMappingsFormSchema = z.object({
  invoiceId: identifier, supplierId: z.string(),
  items: z.array(z.object({
    itemNumber: z.number().int().positive(), productCode: z.string(), productDescription: z.string(),
    matchedProductId: identifier.optional(), matchedVariationId: identifier.optional(),
    linkMode: z.enum(['single', 'composition']).optional(), sellingPrice: z.number().nonnegative().optional(),
    compositionLinks: z.array(z.object({
      id: identifier, productId: identifier, variationId: identifier.optional(), quantityMultiplier: z.number().positive(),
    }).passthrough()).optional(),
  }).passthrough()),
});
