export interface ProductUnitPriceAliases {
  unit_price?: number | string | null;
  unitPrice?: number | string | null;
  price?: number | string | null;
}

/** Resolves the canonical sale price, retaining `price` only as a legacy fallback. */
export const resolveProductUnitPrice = (product: ProductUnitPriceAliases): number => {
  const value = product.unit_price ?? product.unitPrice ?? product.price ?? 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};
