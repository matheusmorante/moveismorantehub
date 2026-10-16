import { z } from 'zod';
import { purchaseStockEntryFormSchema } from './operationsFormSchemas';

const identity = z.string().trim().min(1, 'Identifique o produto da movimentação.');
const optionalIdentity = z.string().trim().min(1).optional();
const movementDate = z.union([z.iso.date(), z.iso.datetime({ offset: true })]);
export const inventoryMoveCommandSchema = z.object({
  productId: identity, variationId: optionalIdentity,
  productDescription: z.string(),
  type: z.enum(['entry', 'exit', 'withdrawal', 'adjustment', 'balance']),
  quantity: z.number({ error: 'Informe uma quantidade válida.' }), date: movementDate,
  label: z.string().optional(), unitCost: z.number().nonnegative().optional(), unitPrice: z.number().nonnegative().optional(),
  relatedEntityId: optionalIdentity,
  relatedEntityType: z.enum(['sales_order', 'purchase_order', 'adjustment', 'manual']).optional(),
  sourceReceiptId: optionalIdentity, sourceItemIndex: z.number().int().nonnegative().optional(),
  observation: z.string().optional(),
  status: z.enum(['effective', 'reversed', 'active', 'cancelled']).optional(),
  reversalReason: z.string().optional(), reversedAt: movementDate.optional(),
}).superRefine((move, context) => {
  const adjustment = move.type === 'adjustment' || move.type === 'balance';
  if (move.quantity === 0 || (!adjustment && move.quantity < 0)) {
    context.addIssue({ code: 'custom', path: ['quantity'], message: adjustment ? 'O ajuste não pode ser zero.' : 'Informe uma quantidade maior que zero.' });
  }
  if ((move.sourceReceiptId === undefined) !== (move.sourceItemIndex === undefined)) {
    context.addIssue({ code: 'custom', path: ['sourceReceiptId'], message: 'Identifique o recebimento e a linha de origem juntos.' });
  }
});

export const orderInventoryActionFormSchema = z.object({
  reason: z.string().trim().min(1, 'Informe o motivo da movimentação.'),
  orderId: z.string().trim().min(1, 'Pedido não identificado.'),
  type: z.enum(['entry', 'withdrawal']),
  items: z.array(z.object({ productId: identity, variationId: optionalIdentity, productDescription: z.string(),
    quantity: z.number().positive('Informe uma quantidade maior que zero.'), unitPrice: z.number().nonnegative().optional(),
  })).min(1, 'Não há itens vinculados ao catálogo para movimentar no estoque.'),
});

export const stockLaunchFormSchema = z.object({
  productId: identity, variationId: z.string().trim().min(1, 'Vincule uma variação cadastrada antes de movimentar o estoque.'),
  productDescription: z.string(), type: z.enum(['entry', 'exit', 'adjustment']),
  quantity: z.number(), currentStock: z.number(), newDesiredStock: z.string(),
  observation: z.string().trim().min(1, 'Informe o motivo da movimentação.'),
}).superRefine((data, context) => {
  if (data.type !== 'adjustment') {
    if (data.quantity <= 0) context.addIssue({ code: 'custom', path: ['quantity'], message: 'Informe uma quantidade maior que zero.' });
    return;
  }
  if (!data.newDesiredStock.trim() || !Number.isFinite(Number(data.newDesiredStock))
    || !Number.isFinite(Number(data.newDesiredStock) - data.currentStock)) {
    context.addIssue({ code: 'custom', path: ['newDesiredStock'], message: 'Informe um novo saldo válido.' });
  } else if (Number(data.newDesiredStock) === data.currentStock) {
    context.addIssue({ code: 'custom', path: ['newDesiredStock'], message: 'O novo saldo é igual ao saldo atual.' });
  }
}).transform((data) => ({
  productId: data.productId, variationId: data.variationId, productDescription: data.productDescription,
  type: data.type === 'adjustment' ? 'balance' as const : data.type === 'exit' ? 'withdrawal' as const : 'entry' as const,
  quantity: data.type === 'adjustment' ? Number(data.newDesiredStock) - data.currentStock : data.quantity,
  observation: data.observation, currentStock: data.currentStock,
}));

export const purchaseInventoryEntryFormSchema = purchaseStockEntryFormSchema.extend({
  purchaseId: z.string().trim().min(1, 'Pedido de compra não identificado.'),
  status: z.enum(['ordered', 'fulfilled', 'cancelled']).refine((value) => value !== 'cancelled', 'Este pedido de compra está cancelado.'),
  stockProcessed: z.boolean().refine((value) => !value, 'As entradas deste pedido já foram registradas.'),
  items: z.array(z.object({ productId: identity, variationId: optionalIdentity, description: z.string(),
    quantity: z.number().positive('Informe uma quantidade maior que zero.'), unitCost: z.number().nonnegative('Informe um custo válido.'),
  })).min(1, 'Inclua os itens do pedido de compra.'),
});

export const inventoryMoveUpdateCommandSchema = z.object({
  id: z.string().trim().min(1, 'Movimento não identificado.'),
  updates: z.object({
    quantity: z.number().nonnegative().optional(), unitCost: z.number().nonnegative().optional(),
  }).strict().refine((value) => Object.values(value).some((field) => field !== undefined), 'Informe os campos da alteração.'),
  expected: z.object({ productId: identity, quantity: z.number().nonnegative(), unitCost: z.number().nonnegative() }),
});

/** A ledger write may have committed even when its response/balance is unconfirmed. */
export class InventoryMoveUnconfirmedError extends Error {
  readonly uncertain = true;
  constructor(readonly persistedMoveId?: string) {
    super(persistedMoveId
      ? 'O movimento foi gravado, mas o saldo não foi confirmado. Consulte o estoque antes de repetir.'
      : 'Não foi possível confirmar a gravação. Consulte os movimentos antes de repetir.');
  }
}
