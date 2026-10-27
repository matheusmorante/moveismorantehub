/**
 * Normalizes legacy variation SKUs that had an internal token appended after
 * the commercial sequence, while preserving the user-managed SKU otherwise.
 */
export const normalizeProductVariationSku = (sku?: string | null): string => {
  const value = String(sku || '').trim();
  return value.replace(/^(.*-\d{2})-[a-z0-9_-]+$/i, '$1');
};

export interface ProductVariationSkuSource {
  sku?: string | null;
}

/** Generates the lowest available variation SKU from its parent code. */
export const generateVariationSku = (
  parentCode: string,
  indexOrVariations: number | readonly ProductVariationSkuSource[],
  offset: number = 0
): string => {
  const cleanParent = parentCode ? parentCode.trim() : '000000';

  if (typeof indexOrVariations === 'number') {
    const suffix = String(indexOrVariations + 1 + offset).padStart(2, '0');
    return `${cleanParent}-${suffix}`;
  }

  const variations = Array.isArray(indexOrVariations) ? indexOrVariations : [];
  const usedSuffixes = new Set<number>();
  const parentPrefix = `${cleanParent}-`.toUpperCase();

  variations.forEach((variation) => {
    if (!variation?.sku) return;
    const sku = String(variation.sku).trim();
    let number: number | null = null;
    const normalizedSku = sku.toUpperCase();
    if (normalizedSku.startsWith(parentPrefix)) {
      const suffix = sku.slice(cleanParent.length + 1);
      if (/^\d+$/.test(suffix)) number = Number.parseInt(suffix, 10);
    }
    if (number === null) {
      const trailingNumber = sku.match(/-(\d+)$/);
      if (trailingNumber?.[1]) number = Number.parseInt(trailingNumber[1], 10);
    }
    if (number !== null && Number.isFinite(number) && number > 0) {
      usedSuffixes.add(number);
    }
  });

  const targetOffset = Math.max(0, offset || 0);
  let availableCount = 0;
  let candidate = 1;
  while (true) {
    if (!usedSuffixes.has(candidate)) {
      if (availableCount === targetOffset) {
        return `${cleanParent}-${String(candidate).padStart(2, '0')}`;
      }
      availableCount++;
    }
    candidate++;
  }
};

/** Keeps list adapters consistent: preserve a commercial SKU, synthesize only when absent. */
export const resolveProductVariationSku = (
  sku: string | null | undefined,
  parentSku: string,
  index: number
): string =>
  normalizeProductVariationSku(sku) ||
  `${parentSku}-${String(index + 1).padStart(2, '0')}`;
