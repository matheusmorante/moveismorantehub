import { z } from 'zod';

// ─── Esquemas de Entrega e Rota ──────────────────────────────────────────────

export const UNATTENDED_DELIVERY_REASONS = [
  'Cliente comunicou que está ausente',
  'Ninguém Atendeu no Local',
  'Outro Motivo',
] as const;

export const unattendedDeliveryFormSchema = z.object({
  reason: z.enum(UNATTENDED_DELIVERY_REASONS),
  notes: z.string(),
  proofUrls: z
    .array(z.url('Anexe uma imagem válida como evidência.'))
    .max(5),
}).superRefine((values, ctx) => {
  if (values.reason === 'Ninguém Atendeu no Local' && values.proofUrls.length === 0) {
    ctx.addIssue({
      code: 'custom',
      path: ['proofUrls'],
      message: 'Anexe pelo menos uma imagem para o motivo “Ninguém Atendeu no Local”.',
    });
  }
});

export const UNATTENDED_PREPARATION_REASONS = [
  'Cliente não poderá receber no momento',
  'Cliente quer Cancelar',
  'Problema no veículo',
  'Outro motivo',
] as const;

/**
 * Insucesso antecipado (etapa de Preparação): "Não será possível entregar".
 * "Outro motivo" exige o texto do motivo; os demais motivos dispensam observações e fotos.
 */
export const unattendedPreparationFormSchema = z
  .object({
    reason: z.enum(UNATTENDED_PREPARATION_REASONS),
    notes: z.string(),
    proofUrls: z.array(z.url('Anexe uma imagem válida como evidência.')).max(5),
  })
  .superRefine((values, ctx) => {
    if (values.reason === 'Outro motivo' && !values.notes.trim()) {
      ctx.addIssue({
        code: 'custom',
        path: ['notes'],
        message: 'Descreva o motivo pelo qual não será possível entregar.',
      });
    }
  });

export const deliveryResponsibleSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(1, 'Informe o nome do responsável.'),
  role: z.string().optional(),
});

export const deliveryRouteFormSchema = z.object({
  orderId: z.string().min(1, 'Pedido não identificado.'),
  checklist: z.array(z.object({ id: z.string().min(1), checked: z.boolean() }).passthrough()),
  responsibles: z
    .array(deliveryResponsibleSchema)
    .min(1, 'Adicione pelo menos um responsável pela entrega.')
    .optional(),
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

// ─── Tipos Inferidos ──────────────────────────────────────────────────────────
export type UnattendedDeliveryFormValues = z.infer<typeof unattendedDeliveryFormSchema>;
export type DeliveryResponsibleValues = z.infer<typeof deliveryResponsibleSchema>;
export type DeliveryRouteFormValues = z.infer<typeof deliveryRouteFormSchema>;
export type DeliveryFinishFormValues = z.infer<typeof deliveryFinishFormSchema>;
