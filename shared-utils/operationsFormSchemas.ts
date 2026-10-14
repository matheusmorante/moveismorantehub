import { z } from 'zod';

const requiredText = z.string().refine((value) => Boolean(value.trim()), 'Preencha este campo.');
const date = z.iso.date('Informe uma data válida.');
const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Informe um horário válido.');

export const assemblyScheduleFormSchema = z.object({ item: requiredText, date, time });
export const assemblyListFormSchema = assemblyScheduleFormSchema.extend({
  type: z.enum(['delivery', 'showroom']), status: z.enum(['pending', 'completed']),
});
export const showcaseAssemblyFormSchema = z.object({
  description: requiredText, quantity: z.number().positive(), date,
  status: z.enum(['pending', 'completed']),
}).passthrough();
export const inventoryReversalFormSchema = z.object({ reason: requiredText });
export const quickRegisterSelectionFormSchema = z.object({
  mode: z.enum(['EXISTING_PARENT', 'NEW_PARENT']),
  parentProductId: z.string().nullable().optional(),
}).superRefine((value, ctx) => {
  if (value.mode === 'EXISTING_PARENT' && !value.parentProductId?.trim()) {
    ctx.addIssue({ code: 'custom', path: ['parentProductId'], message: 'Selecione o produto pai.' });
  }
});
