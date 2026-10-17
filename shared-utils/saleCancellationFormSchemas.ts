import { z } from 'zod';

const identifier = z.string().trim().min(1, 'Identifique a venda antes de consultar o cancelamento.');
const action = z.enum(['none', 'cancel', 'estorno', 'return', 'manual_review', 'blocked', 'pending', 'reconcile', 'batch']);
export const saleCancellationPreviewRequestSchema = z.object({ orderId: identifier });
export const saleCancellationPreviewSchema = z.object({
  action,
  hasAuthorizedInvoice: z.boolean(),
  model: z.string().optional(),
  environment: z.union([z.literal(1), z.literal(2)]).optional(),
  reason: z.string().optional(),
  returnOrderId: identifier.optional(),
  returnOrderStatus: z.string().optional(),
  operations: z.array(z.object({ action, documentId: identifier, environment: z.union([z.literal(1), z.literal(2)]).optional(), model: z.string().optional(), reason: z.string().optional() })).optional(),
}).superRefine((preview, ctx) => {
  if (preview.action === 'batch' && !preview.operations?.length) ctx.addIssue({ code: 'custom', path: ['operations'], message: 'A consulta não identificou as notas fiscais do lote.' });
});
export type SaleCancellationPreview = z.output<typeof saleCancellationPreviewSchema>;
