import { z } from 'zod';
import { imageFilesFormSchema } from './fileFormSchemas';

const requiredText = z.string().refine((value) => Boolean(value.trim()), 'Preencha este campo.');
const date = z.iso.date('Informe uma data válida.');
const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Informe um horário válido.');

// ─── Agendamento & Montagem ──────────────────────────────────────────────────
export const assemblyScheduleFormSchema = z.object({
  item: requiredText,
  date,
  time,
});

export const assemblyListFormSchema = assemblyScheduleFormSchema.extend({
  type: z.enum(['delivery', 'showroom']),
  status: z.enum(['pending', 'completed']),
});

export const showcaseAssemblyFormSchema = z
  .object({
    description: requiredText,
    quantity: z.number().positive(),
    date,
    status: z.enum(['pending', 'completed']),
  })
  .passthrough();

export const inventoryReversalFormSchema = z.object({
  reason: requiredText,
});

export const createStockLabelingFormSchema = (itemCount: number) =>
  z.object({
    orderId: z.string().trim().min(1, 'Pedido não identificado.'),
    checkedItems: z
      .array(z.boolean())
      .min(1, 'O pedido não contém itens para etiquetar.')
      .length(itemCount, 'A conferência deve corresponder aos itens do pedido.'),
  });

// ─── Movimentação & Inventário ──────────────────────────────────────────────
export const inventoryMoveFormSchema = z
  .object({
    type: z.enum(['entry', 'withdrawal', 'balance', 'adjustment']),
    quantity: z.number(),
    date: z
      .string()
      .refine((value) => !value || /^\d{4}-\d{2}-\d{2}$/.test(value), 'Informe uma data válida.'),
    observation: z.string().trim().min(1, 'Por favor, informe um motivo ou observação.'),
  })
  .superRefine((value, ctx) => {
    if (
      value.quantity === 0 ||
      (['entry', 'withdrawal'].includes(value.type) && value.quantity < 0)
    ) {
      ctx.addIssue({
        code: 'custom',
        path: ['quantity'],
        message: ['entry', 'withdrawal'].includes(value.type)
          ? 'Por favor, informe uma quantidade maior que zero.'
          : 'O valor do ajuste não pode ser zero.',
      });
    }
  });

export const purchaseStockEntryFormSchema = z.object({
  date,
  observation: z.string().trim().min(1, 'Informe a observação da movimentação.'),
});

export const inventoryScopeFormSchema = z
  .object({
    type: z.enum(['full', 'supplier', 'custom']),
    name: z.string().trim(),
    supplierId: z.string(),
    responsibleId: z.string().min(1, 'Selecione o responsável pelo inventário.'),
  })
  .superRefine((value, ctx) => {
    if (value.type === 'supplier' && !value.supplierId) {
      ctx.addIssue({
        code: 'custom',
        path: ['supplierId'],
        message: 'Selecione o fornecedor.',
      });
    }
  });

export const quickRegisterSelectionFormSchema = z
  .object({
    mode: z.enum(['EXISTING_PARENT', 'NEW_PARENT']),
    parentProductId: z.string().trim().nullable().optional(),
  })
  .superRefine((value, ctx) => {
    if (value.mode === 'EXISTING_PARENT' && !value.parentProductId?.trim()) {
      ctx.addIssue({
        code: 'custom',
        path: ['parentProductId'],
        message: 'Selecione o produto pai.',
      });
    }
  });

// ─── Indisponibilidade de Estoque (Single Source of Truth) ───────────────────
export const UNAVAILABILITY_REASONS = [
  'Avaria',
  'Defeito',
  'Separação para devolução ao fornecedor',
  'Outro',
] as const;

export const UNAVAILABILITY_TREATMENTS = [
  'Devolução ao fornecedor',
  'Descarte/perda',
  'Outro',
] as const;

export type UnavailabilityReason = (typeof UNAVAILABILITY_REASONS)[number];
export type UnavailabilityTreatment = (typeof UNAVAILABILITY_TREATMENTS)[number];

const baseStockUnavailabilityShape = {
  productId: z.string().trim().min(1, 'Selecione uma variação do produto.'),
  variationId: z.string().trim().min(1, 'Selecione uma variação do produto.'),
  quantity: z.number().positive('Informe uma quantidade válida maior que zero.'),
  availableStock: z.number().nonnegative(),
  supplierId: z.string(),
  reason: z
    .string()
    .refine(
      (value) => (UNAVAILABILITY_REASONS as readonly string[]).includes(value),
      'Selecione um motivo válido.'
    ),
  treatment: z
    .string()
    .refine(
      (value) => (UNAVAILABILITY_TREATMENTS as readonly string[]).includes(value),
      'Selecione um tratamento válido.'
    ),
};

export const stockUnavailabilityFormSchema = z
  .object(baseStockUnavailabilityShape)
  .superRefine((value, ctx) => {
    if (value.quantity > value.availableStock) {
      ctx.addIssue({
        code: 'custom',
        path: ['quantity'],
        message: `Quantidade informada (${value.quantity}) é maior que o estoque atual (${value.availableStock}).`,
      });
    }
    if (value.treatment === 'Devolução ao fornecedor' && !value.supplierId) {
      ctx.addIssue({
        code: 'custom',
        path: ['supplierId'],
        message: 'Fornecedor é obrigatório para devolução.',
      });
    }
  });

export const erpStockUnavailabilityFormSchema = z
  .object({
    ...baseStockUnavailabilityShape,
    observation: z.string(),
    physicalLocation: z.string(),
    photos: z.array(imageFilesFormSchema.shape.files.element),
  })
  .superRefine((value, ctx) => {
    if (value.quantity > value.availableStock) {
      ctx.addIssue({
        code: 'custom',
        path: ['quantity'],
        message: `Quantidade informada (${value.quantity}) é maior que o estoque atual (${value.availableStock}).`,
      });
    }
    if (value.treatment === 'Devolução ao fornecedor' && !value.supplierId) {
      ctx.addIssue({
        code: 'custom',
        path: ['supplierId'],
        message: 'Fornecedor é obrigatório para devolução.',
      });
    }
  });

// ─── Entrega & Rota ──────────────────────────────────────────────────────────
export const unattendedDeliveryFormSchema = z.object({
  reason: z.enum([
    'Cliente Ausente',
    'Ninguém Atendeu no Local',
    'Cliente Recusou Recebimento',
    'Outro Motivo',
  ]),
  notes: z.string(),
  proofUrls: z
    .array(z.union([z.literal(''), z.url('Informe uma URL válida para a evidência.')]))
    .max(5),
});

export const deliveryRouteFormSchema = z.object({
  orderId: z.string().min(1, 'Pedido não identificado.'),
  checklist: z.array(z.object({ id: z.string().min(1), checked: z.boolean() }).passthrough()),
});

export const deliveryFinishFormSchema = z
  .object({
    orderId: z.string().min(1, 'Pedido não identificado.'),
    payments: z
      .array(
        z
          .object({
            method: z.string().optional(),
            amount: z.number().nonnegative().optional(),
            status: z.string().optional(),
            fee: z.number().nonnegative().optional(),
            feeType: z.string().optional(),
          })
          .passthrough()
      )
      .min(1),
  })
  .refine(
    (values) =>
      values.payments.every((payment) =>
        ['pago', 'paid'].includes((payment.status || '').toLowerCase())
      ),
    {
      path: ['payments'],
      message: 'Confirme todos os pagamentos como pagos antes de finalizar a entrega.',
    }
  );

// ─── Tipos Inferidos Exportados ──────────────────────────────────────────────
export type AssemblyScheduleFormValues = z.infer<typeof assemblyScheduleFormSchema>;
export type AssemblyListFormValues = z.infer<typeof assemblyListFormSchema>;
export type ShowcaseAssemblyFormValues = z.infer<typeof showcaseAssemblyFormSchema>;
export type InventoryReversalFormValues = z.infer<typeof inventoryReversalFormSchema>;
export type InventoryMoveFormValues = z.infer<typeof inventoryMoveFormSchema>;
export type PurchaseStockEntryFormValues = z.infer<typeof purchaseStockEntryFormSchema>;
export type InventoryScopeFormValues = z.infer<typeof inventoryScopeFormSchema>;
export type QuickRegisterSelectionFormValues = z.infer<typeof quickRegisterSelectionFormSchema>;
export type StockUnavailabilityFormValues = z.infer<typeof stockUnavailabilityFormSchema>;
export type ErpStockUnavailabilityFormValues = z.infer<typeof erpStockUnavailabilityFormSchema>;
export type UnattendedDeliveryFormValues = z.infer<typeof unattendedDeliveryFormSchema>;
export type DeliveryRouteFormValues = z.infer<typeof deliveryRouteFormSchema>;
export type DeliveryFinishFormValues = z.infer<typeof deliveryFinishFormSchema>;
