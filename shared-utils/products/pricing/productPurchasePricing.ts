export type ProductFreightType = 'fixed' | 'percentage' | 'none';
export type ProductIpiType = 'fixed' | 'percentage' | 'none';

export function calculateProductFinalPurchasePrice(
  costPrice: number,
  ipi: number,
  freightCost: number,
  freightType: ProductFreightType,
  ipiType: ProductIpiType = 'percentage'
): number {
  const ipiAmount =
    ipiType === 'none' ? 0 : ipiType === 'fixed' ? ipi : costPrice * (ipi / 100);
  const freightAmount =
    freightType === 'none'
      ? 0
      : freightType === 'percentage'
        ? costPrice * (freightCost / 100)
        : freightCost;

  return Number((costPrice + ipiAmount + freightAmount).toFixed(2));
}
