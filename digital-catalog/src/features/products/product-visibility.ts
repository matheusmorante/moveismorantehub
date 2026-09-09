/** Fonte única da regra de exposição pública do Catálogo Digital. */
export const isPublicCatalogProduct = (product?: { status?: string | null; deleted_at?: string | null }): boolean =>
  product?.status === 'published' && !product.deleted_at;

export const isPublicCatalogVariation = (variation?: { status?: string | null; active?: boolean | null }): boolean =>
  variation?.status === 'published' && variation?.active !== false;
