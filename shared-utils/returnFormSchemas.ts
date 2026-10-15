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
