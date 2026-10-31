import { PurchaseItem } from '../../../../types/purchase.type';

export interface CalculatedPurchaseCosts {
  readonly processedItems: readonly PurchaseItem[];
  readonly totalValue: number;
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
  const rawDiscountPercent = Number(discountPercent);
  const safeDiscountPercent = Number.isFinite(rawDiscountPercent)
    ? Math.min(100, Math.max(0, rawDiscountPercent))
    : 0;
  const safeIpi = Number.isFinite(Number(ipiPercent)) ? Number(ipiPercent) : 0;
  const safeFreight = Number.isFinite(Number(freightPercent)) ? Number(freightPercent) : 0;

  const processedItems = items.map((item) => {
    const rawBase = item.baseCost ?? item.unitCost;
    const baseCost = Number.isFinite(Number(rawBase)) ? Number(rawBase) : 0;
    const qty = Number.isFinite(Number(item.quantity)) ? Number(item.quantity) : 0;

    const discountedBaseCost = baseCost * (1 - safeDiscountPercent / 100);
    const itemIpi = discountedBaseCost * (safeIpi / 100);
    const itemFreight = baseCost * (safeFreight / 100);
    const rawDiscount = Number(item.discountUnit ?? 0);
    const itemDiscount = Number.isFinite(rawDiscount) ? Math.max(0, rawDiscount) : 0;
    const itemUnitCost = Math.max(0, discountedBaseCost + itemIpi + itemFreight - itemDiscount);
    const itemTotalCost = qty * itemUnitCost;

    return {
      ...item,
      quantity: qty,
      unitCost: Number.isFinite(itemUnitCost) ? Number(itemUnitCost.toFixed(2)) : 0,
      totalCost: Number.isFinite(itemTotalCost) ? Number(itemTotalCost.toFixed(2)) : 0,
    };
  });

  const totalValue = processedItems.reduce((sum, item) => sum + (Number(item.totalCost) || 0), 0);

  return {
    processedItems,
    totalValue,
  };
}
