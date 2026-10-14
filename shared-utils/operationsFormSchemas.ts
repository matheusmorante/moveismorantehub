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
export const inventoryMoveFormSchema = z.object({
  type: z.enum(['entry', 'withdrawal', 'balance', 'adjustment']),
  quantity: z.number(), date: z.string().refine((value) => !value || /^\d{4}-\d{2}-\d{2}$/.test(value), 'Informe uma data válida.'),
  observation: z.string().trim().min(1, 'Por favor, informe um motivo ou observação.'),
}).superRefine((value, ctx) => {
  if (value.quantity === 0 || (['entry', 'withdrawal'].includes(value.type) && value.quantity < 0)) {
    ctx.addIssue({ code: 'custom', path: ['quantity'], message: ['entry', 'withdrawal'].includes(value.type) ? 'Por favor, informe uma quantidade maior que zero.' : 'O valor do ajuste não pode ser zero.' });
  }
});
export const purchaseStockEntryFormSchema = z.object({ date, observation: z.string().trim().min(1, 'Informe a observação da movimentação.') });
export const inventoryScopeFormSchema = z.object({
  type: z.enum(['full', 'supplier', 'custom']), name: z.string().trim(),
  supplierId: z.string(), responsibleId: z.string().min(1, 'Selecione o responsável pelo inventário.'),
}).superRefine((value, ctx) => {
  if (value.type === 'supplier' && !value.supplierId) ctx.addIssue({ code: 'custom', path: ['supplierId'], message: 'Selecione o fornecedor.' });
});
export const quickRegisterSelectionFormSchema = z.object({
  mode: z.enum(['EXISTING_PARENT', 'NEW_PARENT']),
  parentProductId: z.string().nullable().optional(),
}).superRefine((value, ctx) => {
  if (value.mode === 'EXISTING_PARENT' && !value.parentProductId?.trim()) {
    ctx.addIssue({ code: 'custom', path: ['parentProductId'], message: 'Selecione o produto pai.' });
  }
});

export const UNAVAILABILITY_REASONS = ['Avaria', 'Defeito', 'Separação para devolução ao fornecedor', 'Outro'] as const;
export const UNAVAILABILITY_TREATMENTS = ['Devolução ao fornecedor', 'Descarte/perda', 'Outro'] as const;
export const stockUnavailabilityFormSchema = z.object({
  productId: requiredText, variationId: requiredText,
  quantity: z.number().positive('Informe uma quantidade válida maior que zero.'),
  availableStock: z.number().nonnegative(), supplierId: z.string(),
  reason: z.string().refine((value) => (UNAVAILABILITY_REASONS as readonly string[]).includes(value), 'Selecione um motivo válido.'),
  treatment: z.string().refine((value) => (UNAVAILABILITY_TREATMENTS as readonly string[]).includes(value), 'Selecione um tratamento válido.'),
}).superRefine((value, ctx) => {
  if (value.quantity > value.availableStock) ctx.addIssue({ code: 'custom', path: ['quantity'], message: `Quantidade informada (${value.quantity}) é maior que o estoque atual (${value.availableStock}).` });
  if (value.treatment === 'Devolução ao fornecedor' && !value.supplierId) ctx.addIssue({ code: 'custom', path: ['supplierId'], message: 'Fornecedor é obrigatório para devolução.' });
});
