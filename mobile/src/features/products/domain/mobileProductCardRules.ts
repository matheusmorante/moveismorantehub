export const isMobileProductStockLow = (stock: unknown, minStock: unknown): boolean =>
  Number(stock ?? 0) <= Number(minStock ?? 0);

export const getMobileProductCardActionAvailability = (product: {
  isVariation?: boolean;
  isParent?: boolean;
}) => ({
  canDuplicate: !product.isVariation,
  canShowLinkedOrders: !product.isParent,
});
