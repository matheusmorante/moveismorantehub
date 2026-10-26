export interface CategoryProductReference {
  readonly categoryId?: unknown;
  readonly productId?: unknown;
}

/** Conta cada produto apenas uma vez por categoria, mesmo se aparecer nas duas fontes. */
export const countDistinctProductsByCategory = (
  references: readonly CategoryProductReference[]
): Record<string, number> => {
  const productIdsByCategory = new Map<string, Set<string>>();

  references.forEach(({ categoryId, productId }) => {
    if (!categoryId || !productId) return;

    const normalizedCategoryId = String(categoryId);
    const normalizedProductId = String(productId);
    const productIds = productIdsByCategory.get(normalizedCategoryId) ?? new Set<string>();
    productIds.add(normalizedProductId);
    productIdsByCategory.set(normalizedCategoryId, productIds);
  });

  const counts: Record<string, number> = {};
  productIdsByCategory.forEach((productIds, categoryId) => {
    counts[categoryId] = productIds.size;
  });
  return counts;
};
