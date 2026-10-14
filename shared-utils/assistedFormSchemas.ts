import { z } from 'zod';

export const textPromptFormSchema = z.object({ text: z.string().trim().min(1, 'Informe o texto para continuar.') });
const receiptCharge = z.object({ value: z.number().nonnegative(), unit: z.enum(['percent', 'currency']) });
export const assistedReceiptFormSchema = z.object({
  supplierName: z.string().optional(),
  items: z.array(z.object({
    productType: z.string().optional(), model: z.string().optional(), variation: z.string().optional(),
    quantity: z.number().positive(), baseCost: z.number().nonnegative(),
  }).passthrough()).min(1, 'Nenhum item identificado. Descreva os produtos do recebimento.'),
  ipi: receiptCharge.optional(), freight: receiptCharge.optional(), warnings: z.array(z.string()),
}).passthrough();
const optionalText = z.string().nullable().optional();
const optionalMoney = z.number().nonnegative().nullable().optional();
const assistedItem = z.object({
  description: optionalText, productId: optionalText, variationId: optionalText,
  quantity: z.number().positive().nullable().optional(), unitPrice: optionalMoney,
  unitDiscount: optionalMoney, handlingType: optionalText,
}).passthrough();

/** Assisted input can be incomplete; the normal final form remains mandatory. */
export const assistedOrderFormSchema = z.object({
  client: z.object({
    fullName: optionalText, phone: optionalText, cpfCnpj: optionalText, email: optionalText,
    personType: z.enum(['PF', 'PJ']).nullable().optional(), noPhone: z.boolean().optional(), noAddress: z.boolean().optional(),
    marketingOrigin: z.enum(['paid', 'organic']).nullable().optional(),
    fullAddress: z.object({ street: optionalText, number: optionalText, city: optionalText, state: optionalText, cep: optionalText }).passthrough().nullable().optional(),
  }).passthrough().optional(),
  order: z.object({
    seller: optionalText, date: optionalText, observation: optionalText,
    items: z.array(assistedItem).optional(),
    payments: z.array(z.object({ method: optionalText, value: optionalMoney, amount: optionalMoney, installments: z.number().int().positive().optional() }).passthrough()).optional(),
    shipping: z.object({ deliveryMethod: z.enum(['delivery', 'pickup']).optional(), value: optionalMoney }).passthrough().optional(),
  }).passthrough().optional(),
}).passthrough().superRefine((value, ctx) => {
  if (!value.order && !value.client) ctx.addIssue({ code: 'custom', path: ['payload'], message: 'Informe os dados do pedido ou do cliente.' });
});
