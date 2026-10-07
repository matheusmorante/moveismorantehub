import type Product from '@/pages/types/product.type';

type OfflineInventoryVariationRow = Pick<
  NonNullable<Product['variations']>[number],
  'id'
> &
  Partial<NonNullable<Product['variations']>[number]>;

type OfflineInventoryProductRow = Omit<Partial<Product>, 'id' | 'variations'> & {
  id?: string | number;
  variations?: readonly OfflineInventoryVariationRow[] | null;
};

export const groupOfflineInventoryProducts = (
  rows: readonly OfflineInventoryProductRow[]
): Product[] => {
  const products = new Map<string, Product>();
  for (const row of rows) {
    const id = String(row.id);
    const previous = products.get(id);
    if (!previous) {
      products.set(id, { ...row, variations: [...(row.variations || [])] } as Product);
      continue;
    }

    const variations = new Map<string, OfflineInventoryVariationRow>();
    for (const variation of previous.variations || []) {
      variations.set(String(variation.id), variation);
    }
    for (const variation of row.variations || []) variations.set(String(variation.id), variation);
    products.set(id, { ...previous, variations: [...variations.values()] } as Product);
  }
  return [...products.values()];
};
