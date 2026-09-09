/** Fonte única da regra de exposição pública do Catálogo Digital. */
export const isPublicCatalogProduct = (product?: { status?: string | null; deleted_at?: string | null }): boolean =>
  product?.status === 'published' && !product.deleted_at;

export const isPublicCatalogVariation = (variation?: { status?: string | null; active?: boolean | null }): boolean =>
  variation?.status === 'published' && variation?.active !== false;

/** Todo produto possui ao menos uma variação: sem variação pública, não há item público. */
export const hasPublicCatalogItem = (product?: {
  status?: string | null;
  deleted_at?: string | null;
  product_variations?: Array<{ status?: string | null; active?: boolean | null }> | null;
}): boolean => {
  if (!isPublicCatalogProduct(product)) return false;
  const variations = product?.product_variations || [];
  return variations.length === 0 || variations.some(isPublicCatalogVariation);
};
