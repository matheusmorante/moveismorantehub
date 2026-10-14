/** Commercial quantities only. Fiscal allocations have their own validation. */
export type ReturnQuantityItem = {
  productId?: string;
  variationId?: string;
  description?: string;
  orderItemId?: string;
  quantity?: number;
  returnedQuantity?: number;
  originalOrderItemIndex?: number;
};

export type ReturnQuantityRecord = {
  status?: string;
  items?: ReturnQuantityItem[];
};

const normalized = (value: unknown) =>
  String(value ?? '')
    .trim()
    .toLocaleLowerCase('pt-BR');

export const getReturnLineKey = (item: ReturnQuantityItem, index: number) =>
  item.orderItemId || `line-${index}`;

const sameLegacyLine = (left: ReturnQuantityItem, right: ReturnQuantityItem) =>
  normalized(left.productId) === normalized(right.productId) &&
  normalized(left.variationId) === normalized(right.variationId) &&
  normalized(left.description) === normalized(right.description);

/**
 * Computes remaining returnable quantities. New return records use the original
 * line index; older records are allocated by product/variation/description.
 */
export const getReturnableQuantities = (
  soldItems: ReturnQuantityItem[],
  existingReturns: ReturnQuantityRecord[]
): number[] => {
  const returnedByIndex = new Map<number, number>();
  const legacyBySignature: Array<{ item: ReturnQuantityItem; quantity: number }> = [];

  for (const returnOrder of existingReturns) {
    if (returnOrder.status === 'cancelled') continue;
    for (const item of returnOrder.items || []) {
      const quantity = Math.max(0, Number(item.returnedQuantity ?? item.quantity ?? 0));
      if (!Number.isFinite(quantity) || quantity === 0) continue;
      if (
        Number.isInteger(item.originalOrderItemIndex) &&
        Number(item.originalOrderItemIndex) >= 0
      ) {
        const index = Number(item.originalOrderItemIndex);
        returnedByIndex.set(index, (returnedByIndex.get(index) || 0) + quantity);
      } else {
        legacyBySignature.push({ item, quantity });
      }
    }
  }

  const remaining = soldItems.map((item, index) =>
    Math.max(0, (Number.isFinite(Number(item.quantity)) ? Number(item.quantity) : 0) - (returnedByIndex.get(index) || 0))
  );

  // Legacy rows did not identify a source line. Allocate their total across
  // matching sold lines in order, so duplicate SKUs cannot inflate capacity.
  for (const legacy of legacyBySignature) {
    let quantityLeft = legacy.quantity;
    for (let index = 0; index < soldItems.length && quantityLeft > 0; index += 1) {
      if (!sameLegacyLine(legacy.item, soldItems[index])) continue;
      const allocated = Math.min(remaining[index], quantityLeft);
      remaining[index] -= allocated;
      quantityLeft -= allocated;
    }
  }

  return remaining;
};

/** Validates each original line, including repeated lines in the same request. */
export function getReturnRequestValidationError(
  soldItems: ReturnQuantityItem[],
  existingReturns: ReturnQuantityRecord[],
  requestedItems: ReturnQuantityItem[],
): string | null {
  if (!requestedItems.length) return 'RETURN_ITEMS_REQUIRED';
  const remaining = getReturnableQuantities(soldItems, existingReturns);
  const requestedByIndex = new Map<number, number>();
  for (const item of requestedItems) {
    const index = item.originalOrderItemIndex;
    if (!Number.isInteger(index) || Number(index) < 0 || !soldItems[Number(index)])
      return 'RETURN_SOURCE_LINE_INVALID';
    if (!sameLegacyLine(item, soldItems[Number(index)])) return 'RETURN_SOURCE_LINE_MISMATCH';
    const quantity = item.quantity;
    if (typeof quantity !== 'number' || !Number.isFinite(quantity) || quantity <= 0)
      return 'RETURN_QUANTITY_INVALID';
    if (item.returnedQuantity !== undefined && item.returnedQuantity !== quantity)
      return 'RETURN_QUANTITY_MISMATCH';
    requestedByIndex.set(Number(index), (requestedByIndex.get(Number(index)) || 0) + quantity);
  }
  for (const [index, quantity] of requestedByIndex) {
    if (quantity > remaining[index]) return 'RETURN_CAPACITY_EXCEEDED';
  }
  return null;
}
