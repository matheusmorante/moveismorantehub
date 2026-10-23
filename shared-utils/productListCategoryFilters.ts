export const buildProductListCategoryFilter = (
  categoryId: string,
  categoryName?: string | null,
  linkedProductIds: readonly string[] = []
): string => {
  const conditions = [`category_id.eq.${categoryId}`];
  const legacyCategoryName = categoryName?.trim();

  if (legacyCategoryName) {
    const quotedCategoryName = legacyCategoryName.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
    conditions.push(`category.eq."${quotedCategoryName}"`);
  }

  const uniqueProductIds = Array.from(new Set(linkedProductIds.filter(Boolean)));
  if (uniqueProductIds.length > 0) {
    conditions.push(`id.in.(${uniqueProductIds.join(',')})`);
  }

  return conditions.join(',');
};

export const fetchProductListCategoryFilter = async (
  client: { from: (table: string) => any },
  categoryId: string
): Promise<string> => {
  const [categoryResult, categoryLinksResult] = await Promise.all([
    client.from('categories').select('name').eq('id', categoryId).maybeSingle(),
    client.from('product_categories').select('product_id').eq('category_id', categoryId),
  ]);

  if (categoryResult.error) throw categoryResult.error;
  if (categoryLinksResult.error) throw categoryLinksResult.error;

  const linkedProductIds = (categoryLinksResult.data || [])
    .map((row: { product_id?: string | null }) => row.product_id)
    .filter((productId: string | null | undefined): productId is string => Boolean(productId));

  return buildProductListCategoryFilter(categoryId, categoryResult.data?.name, linkedProductIds);
};
