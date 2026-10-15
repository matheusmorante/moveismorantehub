import { z } from 'zod';
import type { Product, Variation } from '../erp/src/pages/types/product.type';
import { getVariationRegistrationIssue } from './productVariationRules';

const nonnegative = z.number().nonnegative('Informe um valor finito maior ou igual a zero.');

/** Drafts preserve incomplete fields while protecting the actual numeric payload. */
export const productVariationDraftSchema = z.object({
  id: z.string(),
  sku: z.string(),
  name: z.string(),
  stock: nonnegative,
  unitPrice: nonnegative,
  active: z.boolean(),
  promoPrice: nonnegative.optional(),
  costPrice: nonnegative.optional(),
  freightCost: nonnegative.optional(),
  ipiPercent: nonnegative.optional(),
  finalPurchasePrice: nonnegative.optional(),
  minStock: nonnegative.optional(),
  leadTime: nonnegative.optional(),
  avgMonthlySales: nonnegative.optional(),
  width: nonnegative.optional(),
  height: nonnegative.optional(),
  depth: nonnegative.optional(),
  weight: nonnegative.optional(),
  pkgWidth: nonnegative.optional(),
  pkgHeight: nonnegative.optional(),
  pkgDepth: nonnegative.optional(),
  attributes: z.array(z.object({
    name: z.string(),
    value: z.string(),
    showName: z.boolean().optional(),
  }).passthrough()),
  comboItems: z.array(z.object({
    productId: z.string(),
    variationId: z.string().optional(),
    quantity: nonnegative,
    description: z.string(),
    unitPrice: nonnegative,
    stock: nonnegative,
  }).passthrough()).optional(),
}).passthrough();

/** Completion retains the existing dynamic characteristics and parent rules. */
export const createProductVariationFormSchema = (parent: Partial<Product>, isSingleVariation = false) =>
  productVariationDraftSchema.superRefine((values, context) => {
    if (isSingleVariation) {
      // Quando é variação única, campos herdados do pai (preço, dimensões, características)
      // são validados no formulário do produto pai, e não na variação onde esses campos estão desativados.
      return;
    }
    const issue = getVariationRegistrationIssue(parent, values as Variation);
    if (issue) context.addIssue({ code: 'custom', path: [issue.tab], message: issue.message });
  });

