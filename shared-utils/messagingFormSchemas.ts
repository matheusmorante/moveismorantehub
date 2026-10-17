import { z } from 'zod';
import { textPromptFormSchema } from './assistedFormSchemas';

const phone = z.string().transform((value) => value.replace(/\D/g, ''));
export const whatsappManualFormSchema = z.object({ phone, message: z.string() });
export const whatsappMessageFormSchema = whatsappManualFormSchema.extend({
  phone: phone.pipe(z.string().min(10, 'Informe um telefone com DDD válido.')),
  message: z.string().refine((value) => Boolean(value.trim()), 'Digite uma mensagem para enviar.'),
});
export const attendanceVoiceFormSchema = textPromptFormSchema.extend({
  customerPhone: z.string().trim().pipe(z.union([z.literal(''), whatsappMessageFormSchema.shape.phone])),
});
const suggestionPhone = whatsappMessageFormSchema.shape.phone;
export const attendanceSuggestionFormSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('ASSISTANCE'), data: z.object({
    customerPhone: suggestionPhone, customerName: z.string().optional(),
    description: z.string().optional(), matchedProductId: z.string().trim().min(1).optional(),
  }) }),
  z.object({ type: z.literal('DESIRE'), data: z.object({
    customer_phone: suggestionPhone, customer_name: z.string().optional(),
    product_name: z.string().trim().min(1, 'Informe o produto desejado.'), details: z.string().optional(),
    status: z.literal('pending'),
  }) }),
]);
export const whatsappConnectionFormSchema = z.object({
  accessToken: z.string().trim().min(1, 'Preencha o Token de Acesso.'),
  phoneNumberId: z.string().trim().min(1, 'Preencha o ID do telefone.'),
}).passthrough();
export const whatsappTemplatesQueryFormSchema = z.object({
  accessToken: z.string().trim().min(1, 'Preencha o Token de Acesso.'),
  wabaId: z.string().trim().min(1, 'Preencha o WABA ID.'),
}).passthrough();
export const whatsappTemplateTestFormSchema = z.object({
  phone: phone.pipe(z.string().min(10, 'Informe um telefone com DDD válido.')),
  template: z.string().trim().min(1, 'Preencha o nome do modelo.'),
  language: z.string().trim().min(1), variableCount: z.number().int().min(0).max(8),
});

export const whatsappTemplateTestCommandSchema = whatsappTemplateTestFormSchema.extend({ config: whatsappConnectionFormSchema });
