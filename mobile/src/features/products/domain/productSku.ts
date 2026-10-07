interface VariationSkuSource {
  sku?: string | null;
}

/** Generates a variation SKU from its parent code and a one-based sequence. */
export const generateVariationSku = (
  parentCode: string,
  indexOrVariations: number | readonly VariationSkuSource[]
): string => {
  const cleanParent = parentCode ? parentCode.trim() : '000000';

  if (typeof indexOrVariations === 'number') {
    return `${cleanParent}-${String(indexOrVariations + 1).padStart(2, '0')}`;
  }

  let maxSuffix = indexOrVariations.length;
  indexOrVariations.forEach((variation) => {
    if (!variation.sku) return;
    const match = String(variation.sku).trim().match(/-(\d+)$/);
    const suffix = match?.[1] ? Number.parseInt(match[1], 10) : Number.NaN;
    if (Number.isFinite(suffix) && suffix > maxSuffix) maxSuffix = suffix;
  });

  return `${cleanParent}-${String(maxSuffix + 1).padStart(2, '0')}`;
};
