import { z } from 'zod';
import type Order from '../erp/src/pages/types/order.type';
import type { CommercialRequiredFields } from './commercialDomainTypes';
import { validateAssistanceOrder, validateOrder, type ValidationErrors } from './commercialOrderRules';
import { commercialSchedulingFormSchema } from './commercialSchedulingFormSchema';
import { orderCompositionSnapshotSchema } from './orderCompositionSnapshot';

const orderItemSchema = z.object({
  description: z.string().optional(),
  productId: z.string().optional(),
  quantity: z.number().nonnegative('A quantidade não pode ser negativa.'),
  unitPrice: z.number().nonnegative('O preço do item não pode ser negativo.'),
  unitDiscount: z.number().nonnegative().default(0),
  compositionGroup: orderCompositionSnapshotSchema.optional(),
  assemblyResponsible: z.enum(['Nossa equipe', 'Montador terceirizado', '']).optional(),
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
    callBeforeDelivery: z.boolean().optional(),
    bringCardMachine: z.boolean().optional(),
    callOnArrival: z.boolean().optional(),
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
    if (
      value.orderType === 'sale' &&
      value.shipping?.deliveryMethod === 'delivery' &&
      value.shipping.callBeforeDelivery === undefined
    ) {
      ctx.addIssue({
        code: 'custom',
        path: ['shipping', 'callBeforeDelivery'],
        message: 'Selecione se é necessário ligar antes da entrega.',
      });
    }
    if (
      value.orderType === 'sale' &&
      value.shipping?.deliveryMethod === 'delivery' &&
      value.shipping.bringCardMachine === undefined
    ) {
      ctx.addIssue({
        code: 'custom',
        path: ['shipping', 'bringCardMachine'],
        message: 'Selecione se é necessário levar máquina de cartão.',
      });
    }
    if (
      value.orderType === 'sale' &&
      value.shipping?.deliveryMethod === 'delivery' &&
      value.shipping.callOnArrival === undefined
    ) {
      ctx.addIssue({
        code: 'custom',
        path: ['shipping', 'callOnArrival'],
        message: 'Selecione se é necessário ligar ao chegar.',
      });
    }
    value.items.forEach((item, index) => {
      if (item.quantity <= 0) ctx.addIssue({ code: 'custom', path: ['items', index, 'quantity'], message: 'A quantidade deve ser maior que zero.' });
    });
  }
  const compositionGroups = new Map<string, Array<{ item: (typeof value.items)[number]; index: number }>>();
  value.items.forEach((item, index) => {
    const group = item.compositionGroup;
    if (!group) return;
    const members = compositionGroups.get(group.groupId) || [];
    members.push({ item, index });
    compositionGroups.set(group.groupId, members);
    const expectedQuantity = group.quantityPerComposition * group.orderedQuantity;
    if (Math.abs(item.quantity - expectedQuantity) > 0.000001) {
      ctx.addIssue({ code: 'custom', path: ['items', index, 'quantity'], message: 'A quantidade do componente deve corresponder à quantidade do produto composto.' });
    }
    if (group.componentIndex >= group.componentCount) {
      ctx.addIssue({ code: 'custom', path: ['items', index, 'compositionGroup', 'componentIndex'], message: 'Componente inválido para o produto composto.' });
    }
  });
  compositionGroups.forEach((members) => {
    const group = members[0].item.compositionGroup!;
    const componentIndexes = new Set(members.map(({ item }) => item.compositionGroup!.componentIndex));
    const snapshotMismatch = members.some(({ item }) => {
      const candidate = item.compositionGroup!;
      return candidate.productId !== group.productId ||
        candidate.variationId !== group.variationId ||
        candidate.description !== group.description ||
        candidate.code !== group.code ||
        candidate.orderedQuantity !== group.orderedQuantity ||
        candidate.componentCount !== group.componentCount;
    });
    if (members.length !== group.componentCount || componentIndexes.size !== group.componentCount || snapshotMismatch) {
      ctx.addIssue({ code: 'custom', path: ['items', members[0].index, 'compositionGroup'], message: 'A composição do produto está incompleta ou inconsistente.' });
    }
  });
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
  id: z.string().trim().min(1).optional(),
  orderType: z.literal('assistance'),
  status: z.enum(['draft', 'scheduled', 'fulfilled', 'cancelled']),
  date: z.string(), seller: z.string().trim(), assistanceDescription: z.string().trim(),
  observation: z.string().optional(),
  assistanceCost: z.number().nonnegative(), assistanceServiceValue: z.number().nonnegative(),
  items: z.array(orderItemSchema),
  linkedOrderId: z.string().optional(),
  assistanceItems: z.array(z.object({
    id: z.string(), description: z.string(), quantity: z.number().nonnegative('A quantidade não pode ser negativa.'), originalOrderId: z.string().optional(),
    handlingType: z.string().optional(), observation: z.string().optional(),
  }).passthrough()),
  customerData: z.object({
    fullName: z.string().trim(), phone: z.string().trim(), noPhone: z.boolean().optional(),
    fullAddress: z.object({
      cep: z.string().optional(), street: z.string().optional(), number: z.string().optional(), complement: z.string().optional(), observation: z.string().optional(), neighborhood: z.string().optional(), city: z.string().optional(), state: z.string().optional(),
    }).passthrough().optional(),
  }).passthrough(),
  shipping: z.object({
    deliveryMethod: z.enum(['delivery', 'pickup']).optional(),
    scheduling: commercialSchedulingFormSchema.passthrough(),
  }).passthrough(),
}).passthrough().superRefine((value, ctx) => {
  if (value.status !== 'draft') value.assistanceItems.forEach((item, index) => {
    if (item.quantity <= 0) ctx.addIssue({ code: 'custom', path: ['assistanceItems', index, 'quantity'], message: 'Informe uma quantidade maior que zero.' });
  });
  for (const [field, message] of Object.entries(validateAssistanceOrder(value as unknown as Order, requiredFields))) {
    ctx.addIssue({ code: 'custom', path: [field], message });
  }
});
export const assistanceOrderDraftFormSchema = createAssistanceOrderFormSchema().safeExtend({ status: z.literal('draft') });
export const assistanceSavedIdSchema = z.string().trim().min(1, 'O serviço não confirmou o ID da assistência.');
export const assistanceLinkedOrderLookupSchema = z.object({ orderId: z.string().trim().min(1, 'Identifique a venda vinculada.') });

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
