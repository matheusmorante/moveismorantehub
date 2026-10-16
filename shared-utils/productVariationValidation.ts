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
    const attributes = new Set<string>();
    values.attributes.forEach((attribute, index) => {
      if (!attribute.name.trim() || !attribute.value.trim()) context.addIssue({ code: 'custom', path: ['attributes', index], message: 'Complete o nome e o valor de cada atributo ou remova a linha.' });
      const key = attribute.name.trim().toLocaleLowerCase('pt-BR');
      if (attributes.has(key)) context.addIssue({ code: 'custom', path: ['attributes', index], message: 'Não repita o mesmo atributo na variação.' });
      attributes.add(key);
    });
    values.comboItems?.forEach((item, index) => {
      if (!item.productId.trim() || !item.description.trim() || (item.variationId !== undefined && !item.variationId.trim())) context.addIssue({ code: 'custom', path: ['comboItems', index], message: 'Selecione o produto de cada componente ou remova a linha.' });
      if (item.quantity < 1) context.addIssue({ code: 'custom', path: ['comboItems', index, 'quantity'], message: 'Informe quantidade maior ou igual a um para o componente.' });
    });
    if (isSingleVariation) {
      // Quando é variação única, campos herdados do pai (preço, dimensões, características)
      // são validados no formulário do produto pai, e não na variação onde esses campos estão desativados.
      return;
    }
    const issue = getVariationRegistrationIssue(parent, values as Variation);
    if (issue) context.addIssue({ code: 'custom', path: [issue.tab], message: issue.message });
  });

/** The displayed discount is part of the submit intent, even if preview math clamps it. */
export const createProductVariationSubmissionSchema = (parent: Partial<Product>, isSingleVariation = false) => z.object({
  variation: createProductVariationFormSchema(parent, isSingleVariation),
  discountPercent: z.string(), discountFixed: z.string(),
}).superRefine((values, context) => {
  if (isSingleVariation || values.variation.syncUnitPrice) return;
  for (const [field, maximum, message] of [
    ['discountPercent', 100, 'Informe um desconto percentual entre zero e 100.'],
    ['discountFixed', values.variation.unitPrice, 'O desconto em reais deve ficar entre zero e o preço de venda.'],
  ] as const) {
    const raw = values[field].trim();
    if (raw && (!Number.isFinite(Number(raw)) || Number(raw) < 0 || Number(raw) > maximum)) context.addIssue({ code: 'custom', path: [field], message });
  }
});

