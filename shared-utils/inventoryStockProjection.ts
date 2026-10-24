export interface InventoryStockVariation {
  id: string;
  stock?: number | null;
  costPrice?: number | null;
  [key: string]: unknown;
}

export interface InventoryStockProduct {
  stock?: number | null;
  costPrice?: number | null;
  variations?: InventoryStockVariation[];
}

export interface InventoryStockMovement {
  variationId?: string;
  type: string;
  quantity: number;
  unitCost?: number;
}

export interface InventoryStockProjection {
  stock: number;
  costPrice: number;
  variations: InventoryStockVariation[];
}

/** Applies the ERP's movement delta and moving-average-cost rules to a product snapshot. */
export const applyInventoryMoveToStockProjection = (
  product: InventoryStockProduct,
  move: InventoryStockMovement
): InventoryStockProjection => {
  let stock = Number(product.stock || 0);
  let costPrice = Number(product.costPrice || 0);
  const variations = product.variations ? product.variations.map((variation) => ({ ...variation })) : [];
  const quantity = Number(move.quantity || 0);
  const isEntry = move.type === 'entry';
  const isExit = move.type === 'exit' || move.type === 'withdrawal';
  const isAdjustment = move.type === 'adjustment' || move.type === 'balance';
  const delta = isEntry ? quantity : isExit ? -quantity : isAdjustment ? quantity : 0;

  if (move.variationId && variations.length === 0) {
    throw new Error('Variação não encontrada para confirmar o saldo.');
  }

  if (move.variationId) {
    const variationIndex = variations.findIndex(
      (variation) => String(variation.id) === String(move.variationId)
    );
    if (variationIndex === -1) {
      throw new Error('Variação não encontrada para confirmar o saldo.');
    }

    const variation = variations[variationIndex];
    const previousStock = Number(variation.stock || 0);
    const nextVariationStock = previousStock + delta;
    if (isEntry && move.unitCost !== undefined && nextVariationStock > 0) {
      const previousCost = Number(variation.costPrice || 0);
      variation.costPrice = previousStock <= 0
        ? move.unitCost
        : previousCost > 0
          ? (previousStock * previousCost + quantity * move.unitCost) / nextVariationStock
          : 0;
    }
    variation.stock = nextVariationStock;
    stock = variations.reduce((total, item) => total + Number(item.stock || 0), 0);
    const totalValue = variations.reduce(
      (total, item) => total + Number(item.stock || 0) * Number(item.costPrice || 0),
      0
    );
    costPrice = stock > 0 ? totalValue / stock : 0;
  } else {
    const previousStock = stock;
    stock += delta;
    if (isEntry && move.unitCost !== undefined && stock > 0) {
      costPrice = previousStock <= 0
        ? move.unitCost
        : costPrice > 0
          ? (previousStock * costPrice + quantity * move.unitCost) / stock
          : 0;
    }
  }

  return { stock, costPrice, variations };
};
