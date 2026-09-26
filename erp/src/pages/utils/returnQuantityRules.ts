import Item from '../types/items.type';

export type ReturnQuantityRecord = {
    status?: string;
    items?: Array<Partial<Item> & { originalOrderItemIndex?: number }>;
};

const normalized = (value: unknown) => String(value ?? '').trim().toLocaleLowerCase('pt-BR');

export const getReturnLineKey = (item: Partial<Item>, index: number) =>
    item.orderItemId || `line-${index}`;

const sameLegacyLine = (left: Partial<Item>, right: Partial<Item>) =>
    normalized(left.productId) === normalized(right.productId) &&
    normalized(left.variationId) === normalized(right.variationId) &&
    normalized(left.description) === normalized(right.description);

/**
 * Computes remaining returnable quantities. New return records use the original
 * line index; older records are allocated by product/variation/description.
 */
export const getReturnableQuantities = (
    soldItems: Item[],
    existingReturns: ReturnQuantityRecord[],
): number[] => {
    const returnedByIndex = new Map<number, number>();
    const legacyBySignature: Array<{ item: Partial<Item>; quantity: number }> = [];

    for (const returnOrder of existingReturns) {
        if (returnOrder.status === 'cancelled') continue;
        for (const item of returnOrder.items || []) {
            const quantity = Math.max(0, Number(item.returnedQuantity ?? item.quantity ?? 0));
            if (!Number.isFinite(quantity) || quantity === 0) continue;
            if (Number.isInteger(item.originalOrderItemIndex) && Number(item.originalOrderItemIndex) >= 0) {
                const index = Number(item.originalOrderItemIndex);
                returnedByIndex.set(index, (returnedByIndex.get(index) || 0) + quantity);
            } else {
                legacyBySignature.push({ item, quantity });
            }
        }
    }

    const remaining = soldItems.map((item, index) =>
        Math.max(0, Number(item.quantity || 0) - (returnedByIndex.get(index) || 0))
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
