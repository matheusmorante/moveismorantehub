import { z } from 'zod';

// ─── Esquemas de Entrega e Rota ──────────────────────────────────────────────

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
