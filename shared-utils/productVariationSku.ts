/**
 * Normalizes legacy variation SKUs that had an internal token appended after
 * the commercial sequence, while preserving the user-managed SKU otherwise.
 */
export const normalizeProductVariationSku = (sku?: string | null): string => {
  const value = String(sku || '').trim();
  return value.replace(/^(.*-\d{2})-[a-z0-9_-]+$/i, '$1');
};

/** Keeps list adapters consistent: preserve a commercial SKU, synthesize only when absent. */
export const resolveProductVariationSku = (
  sku: string | null | undefined,
  parentSku: string,
  index: number
): string =>
  normalizeProductVariationSku(sku) ||
  `${parentSku}-${String(index + 1).padStart(2, '0')}`;
