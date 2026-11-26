export interface CategoryProductReference {
  readonly categoryId?: unknown;
  readonly productId?: unknown;
}

export interface CategoryProductCountRow {
  readonly category_id?: unknown;
  readonly product_count?: unknown;
}

/** Converte o resumo agregado do banco ao formato consumido pelas telas. */
export const mapCategoryProductCountRows = (
  rows: readonly CategoryProductCountRow[]
): Record<string, number> => {
  const counts: Record<string, number> = {};

  rows.forEach(({ category_id: categoryId, product_count: productCount }) => {
    if (categoryId == null || categoryId === '' || productCount == null) return;

    const normalizedCount = Number(productCount);
    if (!Number.isFinite(normalizedCount) || normalizedCount < 0) return;

    counts[String(categoryId)] = normalizedCount;
  });

  return counts;
};

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
