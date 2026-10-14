import { z } from 'zod';
import type Order from '../erp/src/pages/types/order.type';
import type { CommercialRequiredFields } from './commercialDomainTypes';
import { validateAssistanceOrder, validateOrder, type ValidationErrors } from './commercialOrderRules';

const orderItemSchema = z.object({
  description: z.string().optional(),
  productId: z.string().optional(),
  quantity: z.number().nonnegative('A quantidade não pode ser negativa.'),
  unitPrice: z.number().nonnegative('O preço do item não pode ser negativo.'),
  unitDiscount: z.number().nonnegative().default(0),
  discountType: z.enum(['fixed', 'percentage']).default('fixed'),
}).passthrough().superRefine((item, ctx) => {
  const limit = item.discountType === 'percentage' ? 100 : item.unitPrice;
  if (item.unitDiscount > limit) ctx.addIssue({ code: 'custom', path: ['unitDiscount'], message: 'O desconto não pode exceder o valor do item.' });
});

/** Same contract for forms, server mutations and future synthetic preparation.
 * Settings must be supplied by the caller; the server reads its own settings.
 */
export const createOrderDomainSchema = (requiredFields: CommercialRequiredFields = {}) => z.object({
  orderType: z.enum(['sale', 'assistance', 'showroom', 'budget', 'return']).default('sale'),
  status: z.enum(['draft', 'quoted', 'scheduled', 'fulfilled', 'cancelled']).default('draft'),
  date: z.string(),
  seller: z.string(),
  customerData: z.object({
    fullName: z.string().optional(), phone: z.string().nullable().optional(), noPhone: z.boolean().optional(),
  }).passthrough().optional(),
  items: z.array(orderItemSchema).default([]),
  shipping: z.object({
    deliveryMethod: z.enum(['delivery', 'pickup']),
    distance: z.number().optional(), value: z.number().nonnegative().default(0),
  }).passthrough().optional(),
  payments: z.array(z.object({
    method: z.string().optional(), status: z.string().optional(),
    amount: z.number().nonnegative(), fee: z.number().nonnegative().default(0),
    feeType: z.enum(['fixed', 'percentage']).default('fixed'),
  }).passthrough()).default([]),
}).passthrough().superRefine((value, ctx) => {
  if (value.status !== 'draft') {
    if (!value.date.trim()) ctx.addIssue({ code: 'custom', path: ['date'], message: 'A data do pedido é obrigatória.' });
    if (!value.seller.trim()) ctx.addIssue({ code: 'custom', path: ['seller'], message: 'Selecione o atendente responsável.' });
    value.items.forEach((item, index) => {
      if (item.quantity <= 0) ctx.addIssue({ code: 'custom', path: ['items', index, 'quantity'], message: 'A quantidade deve ser maior que zero.' });
    });
  }
  if (value.status === 'quoted' && value.orderType !== 'budget') {
    ctx.addIssue({ code: 'custom', path: ['status'], message: 'Somente orçamentos podem usar este status.' });
  }
  for (const [field, message] of Object.entries(validateOrder(value as unknown as Order, requiredFields))) {
    ctx.addIssue({ code: 'custom', path: [field], message });
  }
});

export const orderFormSchema = createOrderDomainSchema();
// Autosave may persist an incomplete draft. Final/manual submission retains
// the contextual business checks above; numeric and enum integrity still apply.
export const orderDraftFormSchema = z.object(orderFormSchema.shape).extend({ status: z.literal('draft') }).passthrough();
// Reconciliation only replaces temporary product links; preserve the rest of
// the historical payload without inserting commercial defaults into items.
export const orderReconciliationFormSchema = z.object({
  items: z.array(z.object({ quantity: z.number().positive(), unitPrice: z.number().nonnegative(), productId: z.string().optional() }).passthrough()),
}).passthrough();

export const createAssistanceOrderFormSchema = (requiredFields: CommercialRequiredFields = {}) => z.object({
  status: z.enum(['draft', 'scheduled', 'fulfilled', 'cancelled']),
  date: z.string(), seller: z.string(), assistanceDescription: z.string(),
  assistanceCost: z.number().nonnegative(), assistanceServiceValue: z.number().nonnegative(),
  items: z.array(orderItemSchema),
}).passthrough().superRefine((value, ctx) => {
  for (const [field, message] of Object.entries(validateAssistanceOrder(value as unknown as Order, requiredFields))) {
    ctx.addIssue({ code: 'custom', path: [field], message });
  }
});

export function validateOrderWithZod(order: unknown, requiredFields: CommercialRequiredFields = {}): ValidationErrors {
  const result = createOrderDomainSchema(requiredFields).safeParse(order);
  if (result.success) return {};
  const errors: ValidationErrors = {};
  for (const issue of result.error.issues) {
    const [collection, index, ...field] = issue.path;
    const key = (collection === 'items' || collection === 'payments') && typeof index === 'number'
      ? `${collection === 'items' ? 'item' : 'payment'}_${index}_${field.join('_')}`
      : issue.path.join('_') || 'order';
    errors[key] ??= issue.message;
  }
  return errors;
}
