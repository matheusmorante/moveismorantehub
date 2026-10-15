interface VariationSkuSource {
  sku?: string | null;
}

/** Generates a variation SKU from its parent code, reusing the lowest available sequence slot. */
export const generateVariationSku = (
  parentCode: string,
  indexOrVariations: number | readonly VariationSkuSource[],
  offset: number = 0
): string => {
  const cleanParent = parentCode ? parentCode.trim() : '000000';

  if (typeof indexOrVariations === 'number') {
    return `${cleanParent}-${String(indexOrVariations + 1 + offset).padStart(2, '0')}`;
  }

  const variations = Array.isArray(indexOrVariations) ? indexOrVariations : [];
  const usedSuffixes = new Set<number>();
  const prefixPattern = cleanParent
    ? new RegExp(`^${cleanParent.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}-(\\d+)$`, 'i')
    : null;

  variations.forEach((variation) => {
    if (!variation?.sku) return;
    const skuStr = String(variation.sku).trim();
    let num: number | null = null;
    if (prefixPattern) {
      const matchPrefix = skuStr.match(prefixPattern);
      if (matchPrefix?.[1]) {
        num = Number.parseInt(matchPrefix[1], 10);
      }
    }
    if (num === null) {
      const match = skuStr.match(/-(\d+)$/);
      if (match?.[1]) {
        num = Number.parseInt(match[1], 10);
      }
    }
    if (num !== null && Number.isFinite(num) && num > 0) {
      usedSuffixes.add(num);
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

export const normalizeVariationSku = (sku?: string | null): string => {
  if (!sku) return '';
  return String(sku).trim().toUpperCase();
};
