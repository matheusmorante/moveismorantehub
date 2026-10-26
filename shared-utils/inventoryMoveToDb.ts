/** `withdrawal` remains accepted for legacy rows; current writes normalize it to `exit`. */
export const INVENTORY_EXIT_QUERY_TYPES = ['exit', 'withdrawal'] as const;

/** Maps a validated inventory movement to the persisted ledger contract. */
export interface InventoryMoveDatabaseInput {
  productId: string;
  variationId?: string;
  productDescription: string;
  type: string;
  quantity: number;
  date: string;
  label?: string;
  unitCost?: number;
  unitPrice?: number;
  relatedEntityId?: string;
  sourceReceiptId?: string;
  sourceItemIndex?: number;
  observation?: string;
  status?: string;
  reversalReason?: string;
  reversedAt?: string;
}

export const toInventoryMoveDatabaseRow = (move: InventoryMoveDatabaseInput) => {
  // The database constraint accepts only entry, exit, and adjustment.
  const dbType =
    move.type === 'exit' || move.type === 'withdrawal'
      ? 'exit'
      : move.type === 'adjustment' || move.type === 'balance'
        ? 'adjustment'
        : 'entry';
  const resolvedStatus =
    move.status === 'reversed' || move.status === 'cancelled' ? 'reversed' : 'effective';

  let observationPayload: string | null = null;
  if (move.observation && (move.observation.startsWith('{') || move.observation.startsWith('['))) {
    try {
      const parsed = JSON.parse(move.observation);
      observationPayload = JSON.stringify({
        ...parsed,
        status: resolvedStatus,
        reversalReason: move.reversalReason || parsed.reversalReason || null,
        reversedAt: move.reversedAt || parsed.reversedAt || null,
      });
    } catch {
      observationPayload = move.observation;
    }
  } else if (move.observation || resolvedStatus === 'reversed' || move.reversalReason) {
    observationPayload = JSON.stringify({
      note: move.observation || '',
      status: resolvedStatus,
      reversalReason: move.reversalReason || null,
      reversedAt: move.reversedAt || null,
    });
  }

  return {
    product_id: move.productId,
    variation_id: move.variationId || null,
    product_description: move.productDescription,
    type: dbType,
    quantity: move.quantity,
    date: move.date,
    label: move.label || null,
    unit_cost: move.unitCost ?? null,
    unit_price: move.unitPrice || 0,
    observation: observationPayload,
    order_id: move.relatedEntityId || null,
    source_receipt_id: move.sourceReceiptId || null,
    source_item_index: move.sourceItemIndex ?? null,
    reason: move.reversalReason || move.label || null,
  };
};
