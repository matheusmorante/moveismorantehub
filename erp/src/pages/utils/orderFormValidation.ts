import { z } from 'zod';
import type Order from '../types/order.type';
import { validateOrder, type ValidationErrors } from './validations';

/**
 * Schema Zod para validação estrutural de Pedidos de Venda.
 * Validação compartilhada do formulário real de pedido e dos testes locais da regra.
 */
export const orderFormSchema = z
  .object({
    orderType: z.enum(['sale', 'assistance', 'showroom', 'budget', 'return']).default('sale'),
    status: z.string().optional(),
    date: z.string().min(1, 'A data do pedido é obrigatória.'),
    seller: z.string().min(1, 'Selecione o atendente responsável.'),
    customerData: z
      .object({
        fullName: z.string().min(1, 'Nome do cliente é obrigatório.'),
        noPhone: z.boolean().optional(),
        phone: z.string().optional().nullable(),
      })
      .passthrough(),
    items: z
      .array(
        z
          .object({
            description: z.string().min(1, 'A descrição do item é obrigatória.'),
            quantity: z.number().positive('A quantidade deve ser maior que zero.'),
            unitPrice: z.number().nonnegative(),
          })
          .passthrough()
      )
      .min(1, 'O pedido deve conter pelo menos um produto.'),
    shipping: z
      .object({
        deliveryMethod: z.enum(['delivery', 'pickup']),
        distance: z.number().optional(),
        value: z.number().optional(),
      })
      .passthrough(),
    payments: z
      .array(
        z
          .object({
            method: z.string().min(1, 'Selecione uma forma de pagamento.'),
            amount: z.number().nonnegative(),
            status: z.string().min(1, 'O status do pagamento é obrigatório.'),
          })
          .passthrough()
      )
      .min(1, 'Informe ao menos uma forma de pagamento.'),
  })
  .passthrough();

/**
 * Validação centralizada de pedido combinando validação de regras de negócio
 * e garantia de schema Zod.
 */
export const validateOrderWithZod = (order: Order): ValidationErrors => {
  const zodResult = orderFormSchema.safeParse(order);
  const businessErrors = validateOrder(order);

  if (!zodResult.success) {
    for (const issue of zodResult.error.issues) {
      const field = issue.path.join('_');
      if (!businessErrors[field]) {
        businessErrors[field] = issue.message;
      }
    }
  }

  return businessErrors;
};
