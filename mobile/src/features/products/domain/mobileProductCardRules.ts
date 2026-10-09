export const isMobileProductStockLow = (stock: unknown, minStock: unknown): boolean =>
  Number(stock ?? 0) <= Number(minStock ?? 0);

export const getMobileProductCardActionAvailability = (product: {
  isVariation?: boolean;
  isParent?: boolean;
}) => ({
  canDuplicate: !product.isVariation,
  canShowLinkedOrders: !product.isParent,
});

export const isSalvadoProduct = (product: any): boolean =>
  Boolean(
    product &&
      (product.productKind === 'salvado' ||
        product.product_kind === 'salvado' ||
        product.condition === 'salvado' ||
        product.is_salvado ||
        product.isSalvado)
  );

export const resolveCanonicalOpportunityBadge = (
  product: any,
  oppName?: string | null
): { label: string; isSalvado: boolean } | null => {
  const isSalvado =
    isSalvadoProduct(product) ||
    Boolean(oppName && oppName.toLowerCase().includes('salvado'));

  if (isSalvado) {
    return { label: 'Queima dos Salvados', isSalvado: true };
  }

  if (oppName && oppName.trim()) {
    return { label: oppName.trim(), isSalvado: false };
  }

  return null;
};

