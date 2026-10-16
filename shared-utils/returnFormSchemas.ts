import { z } from 'zod';
import { getReturnRequestValidationError, type ReturnQuantityItem, type ReturnQuantityRecord } from './commercialReturnRules';

const returnedItemSchema = z.object({
  description: z.string().optional(), productId: z.string().optional(),
  quantity: z.number().positive('Informe uma quantidade maior que zero.'),
  unitPrice: z.number().nonnegative('O valor devolvido não pode ser negativo.'),
  returnedQuantity: z.number().positive().optional(),
  originalOrderItemIndex: z.number().int().nonnegative().optional(),
}).passthrough();
// Empty scheduling remains valid until the operator defines the collection.
// This form does not change the backend's scheduling/physical-return policy.
const returnSchedulingSchema = z.object({
  date: z.union([z.literal(''), z.iso.date('Informe uma data válida.')]),
  endDate: z.union([z.literal(''), z.iso.date('Informe uma data válida.')]).optional(),
  dateType: z.enum(['fixed', 'range']).optional(),
  time: z.string(),
  startTime: z.string().regex(/^$|^([01]\d|2[0-3]):[0-5]\d$/, 'Informe um horário válido.').optional(),
  endTime: z.string().regex(/^$|^([01]\d|2[0-3]):[0-5]\d$/, 'Informe um horário válido.').optional(),
  type: z.enum(['fixed', 'range']),
  notInformed: z.boolean().optional(),
  pendingScheduling: z.boolean().optional(),
  immediatePickup: z.boolean().optional(),
});
const collectionFields = {
  collectAtAddress: z.boolean('Informe se haverá coleta no endereço.'),
  scheduling: returnSchedulingSchema,
  observations: z.array(z.string()),
};
export const unlinkedReturnFormSchema = z.object({
  customer: z.object({ fullName: z.string().trim().min(1, 'Informe o cliente da devolução.') }).passthrough(),
  items: z.array(returnedItemSchema).min(1, 'Adicione pelo menos um item devolvido.'),
  ...collectionFields,
});
export const createLinkedReturnFormSchema = (sold: ReturnQuantityItem[], prior: ReturnQuantityRecord[]) => z.object({
  items: z.array(returnedItemSchema).min(1, 'Selecione pelo menos um item para devolver.'),
  ...collectionFields,
}).superRefine((value, ctx) => {
  if (getReturnRequestValidationError(sold, prior, value.items)) {
    ctx.addIssue({ code: 'custom', path: ['items'], message: 'Os itens ou as quantidades da devolução comercial não correspondem ao saldo disponível. Reabra o formulário.' });
  }
});

export const returnFulfillmentFormSchema = z.object({
  orderId: z.string().trim().min(1, 'Devolução comercial não identificada.'),
  orderType: z.string().refine((value) => value === 'return', 'Selecione um pedido de devolução comercial.').transform(() => 'return' as const),
  status: z.string().refine((value) => value === 'scheduled', 'Esta devolução comercial não está aguardando recebimento. Atualize o histórico.').transform(() => 'scheduled' as const),
  returnMethod: z.enum(['store_delivery', 'store_collection']).nullish().transform((value) => value ?? 'store_collection'),
  expectedUpdatedAt: z.iso.datetime({ offset: true }).optional(),
  physicalConfirmed: z.boolean().refine((value) => value, 'Confirme o recebimento físico da mercadoria.').transform(() => true as const),
});
export type ReturnFulfillmentValues = z.output<typeof returnFulfillmentFormSchema>;
export const getReturnFulfillmentFormValues = (order: { id?: string; orderType?: string; status?: string; returnMethod?: 'store_delivery' | 'store_collection'; updatedAt?: string }, physicalConfirmed = false) => ({
  orderId: order.id ?? '', orderType: order.orderType ?? '', status: order.status ?? '', returnMethod: order.returnMethod, expectedUpdatedAt: order.updatedAt, physicalConfirmed,
});
export const returnFulfillmentReceiptSchema = z.object({
  id: z.string().min(1),
  status: z.literal('fulfilled'), order_type: z.literal('return'), updated_at: z.iso.datetime({ offset: true }),
  order_data: z.object({ id: z.string().min(1), orderType: z.literal('return'), status: z.literal('fulfilled'),
    returnStockProcessed: z.boolean(), returnStockReversed: z.boolean().optional(),
  }).passthrough(),
}).passthrough();
export type ReturnFulfillmentReceipt = z.output<typeof returnFulfillmentReceiptSchema>;
export class ReturnFulfillmentUnconfirmedError extends Error {
  readonly uncertain = true;
  constructor() { super('Não foi possível confirmar o recebimento da devolução comercial. Consulte o pedido antes de repetir.'); }
}
