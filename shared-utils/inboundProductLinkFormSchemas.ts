import { z } from 'zod';

const identifier = z.string().trim().min(1, 'Selecione um cadastro válido.');
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

/** Only editable mapping fields are checked; original NF XML/metadata are preserved. */
export const inboundInvoiceMappingFormSchema = z.object({
  id: z.string().optional(), supplierId: identifier.optional(),
  items: z.array(z.object({
    itemNumber: z.number().int().positive(), matchedProductId: identifier.optional(), matchedVariationId: identifier.optional(),
    linkedProductCode: z.string().optional(), productErpName: z.string().optional(),
  }).passthrough()),
}).passthrough();
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
