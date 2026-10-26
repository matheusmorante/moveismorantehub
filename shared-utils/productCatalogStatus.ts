/** Status agregado do pai no Catálogo a partir das variações da família. */
export const resolveProductCatalogParentStatus = (
  variations: readonly { status?: unknown }[]
): 'published' | 'hidden' =>
  variations.some((variation) => variation.status === 'published') ? 'published' : 'hidden';
