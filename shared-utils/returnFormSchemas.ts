import { z } from 'zod';
import { getReturnRequestValidationError, type ReturnQuantityItem, type ReturnQuantityRecord } from './commercialReturnRules';

const returnedItemSchema = z.object({
  description: z.string().optional(), productId: z.string().optional(),
  quantity: z.number().positive('Informe uma quantidade maior que zero.'),
  unitPrice: z.number().nonnegative('O valor devolvido não pode ser negativo.'),
  returnedQuantity: z.number().positive().optional(),
  originalOrderItemIndex: z.number().int().nonnegative().optional(),
}).passthrough();
export const unlinkedReturnFormSchema = z.object({
  customer: z.object({ fullName: z.string().refine((value) => Boolean(value.trim()), 'Informe o cliente da devolução.') }).passthrough(),
  items: z.array(returnedItemSchema).min(1, 'Adicione pelo menos um item devolvido.'),
  collectAtAddress: z.boolean(),
});
export const createLinkedReturnFormSchema = (sold: ReturnQuantityItem[], prior: ReturnQuantityRecord[]) => z.object({
  items: z.array(returnedItemSchema).min(1, 'Selecione pelo menos um item para devolver.'),
  collectAtAddress: z.boolean('Informe se haverá coleta no endereço.'),
}).superRefine((value, ctx) => {
  if (getReturnRequestValidationError(sold, prior, value.items)) {
    ctx.addIssue({ code: 'custom', path: ['items'], message: 'Os itens ou as quantidades da devolução comercial não correspondem ao saldo disponível. Reabra o formulário.' });
  }
});
