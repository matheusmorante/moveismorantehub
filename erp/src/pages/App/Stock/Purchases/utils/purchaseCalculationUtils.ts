import { PurchaseItem } from '../../../../types/purchase.type';

export interface CalculatedPurchaseCosts {
  readonly processedItems: readonly PurchaseItem[];
  readonly totalValue: number;
}

export interface PurchaseItemCostBreakdown {
  readonly quantity: number;
  readonly baseCost: number;
  readonly discountValue: number;
  readonly ipiValue: number;
  readonly freightValue: number;
  readonly unitCost: number;
  readonly subtotal: number;
  readonly totalCost: number;
}

export function calculatePurchaseItemCostBreakdown(
  item: PurchaseItem,
  discountPercent: number,
  ipiPercent: number,
  freightPercent: number
): PurchaseItemCostBreakdown {
  const rawDiscountPercent = Number(discountPercent);
  const safeDiscountPercent = Number.isFinite(rawDiscountPercent)
    ? Math.min(100, Math.max(0, rawDiscountPercent))
    : 0;
  const safeIpi = Number.isFinite(Number(ipiPercent)) ? Number(ipiPercent) : 0;
  const safeFreight = Number.isFinite(Number(freightPercent)) ? Number(freightPercent) : 0;
  const rawBase = item.baseCost ?? item.unitCost;
  const baseCost = Number.isFinite(Number(rawBase)) ? Number(rawBase) : 0;
  const quantity = Number.isFinite(Number(item.quantity)) ? Number(item.quantity) : 0;
  const discountedBaseCost = baseCost * (1 - safeDiscountPercent / 100);
  const ipiValue = discountedBaseCost * (safeIpi / 100);
  const freightValue = baseCost * (safeFreight / 100);
  const rawUnitDiscount = Number(item.discountUnit ?? 0);
  const unitDiscount = Number.isFinite(rawUnitDiscount) ? Math.max(0, rawUnitDiscount) : 0;
  const rawUnitCost = Math.max(
    0,
    discountedBaseCost + ipiValue + freightValue - unitDiscount
  );
  const unitCost = Number.isFinite(rawUnitCost) ? Number(rawUnitCost.toFixed(2)) : 0;

  return {
    quantity,
    baseCost,
    discountValue: baseCost - discountedBaseCost + unitDiscount,
    ipiValue,
    freightValue,
    unitCost,
    subtotal: Number.isFinite(quantity * baseCost) ? quantity * baseCost : 0,
    totalCost: Number.isFinite(quantity * unitCost)
      ? Number((quantity * unitCost).toFixed(2))
      : 0,
  };
}

/**
 * Realiza o cálculo dinâmico de custos dos itens de pedido de compra aplicando IPI e Frete.
 */
export function calculatePurchaseCosts(
  items: readonly PurchaseItem[],
  discountPercent: number,
  ipiPercent: number,
  freightPercent: number
): CalculatedPurchaseCosts {
  const processedItems = items.map((item) => {
    const costs = calculatePurchaseItemCostBreakdown(
      item,
      discountPercent,
      ipiPercent,
      freightPercent
    );

    return {
      ...item,
      quantity: costs.quantity,
      unitCost: costs.unitCost,
      totalCost: costs.totalCost,
    };
  });

  const totalValue = processedItems.reduce((sum, item) => sum + (Number(item.totalCost) || 0), 0);

  return {
    processedItems,
    totalValue,
  };
}
