export interface InventorySupplierLike {
  stockOrigins?: readonly string[] | null;
  stock_origins?: readonly string[] | null;
  tradeName?: string | null;
  trade_name?: string | null;
  fullName?: string | null;
  full_name?: string | null;
  nickname?: string | null;
}

/**
 * Inventory includes a supplier only when its configured origins explicitly
 * include the conventional stock origin. Missing or unknown data fails closed.
 */
export const isStockInventorySupplierEligible = (
  supplier: InventorySupplierLike
): boolean => {
  const stockOrigins =
    supplier.stockOrigins !== undefined ? supplier.stockOrigins : supplier.stock_origins;

  return Array.isArray(stockOrigins) && stockOrigins.includes('normal');
};
