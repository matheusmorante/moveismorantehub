/**
 * Normalizes legacy variation SKUs with an internal token before or after the
 * commercial sequence, while preserving the user-managed SKU otherwise.
 */
export const normalizeProductVariationSku = (
  sku?: string | null,
  parentCode?: string
): string => {
  const value = String(sku || '').trim();
  const legacySequenceBeforeToken = value.match(/^(.+)_\d+-(\d{2})$/i);
  const expectedParentCode = String(parentCode || '').trim();

  if (
    legacySequenceBeforeToken &&
    (expectedParentCode
      ? legacySequenceBeforeToken[1].toUpperCase() === expectedParentCode.toUpperCase()
      : /^\d{6,}$/.test(legacySequenceBeforeToken[1]))
  ) {
    return `${legacySequenceBeforeToken[1]}-${legacySequenceBeforeToken[2]}`;
  }

  return value.replace(/^(.*-\d{2})-[a-z0-9_-]+$/i, '$1');
};

export interface ProductVariationSkuSource {
  sku?: string | null;
}

/** Returns persisted SKUs from a candidate batch that are already owned elsewhere. */
export type VariationSkuCollisionLookup = (
  candidates: readonly string[]
) => Promise<ReadonlySet<string>>;

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

/**
 * Finds the first free sequential SKU without relying on timestamps or random tokens.
 * The lookup is batched so callers only make extra reads when a requested SKU collides.
 */
export const findNextAvailableVariationSku = async (
  parentCode: string,
  findPersistedCollisions: VariationSkuCollisionLookup,
  locallyUsedSkus: ReadonlySet<string>
): Promise<string> => {
  const batchSize = 32;
  const maxCandidates = 4096;

  for (let offset = 0; offset < maxCandidates; offset += batchSize) {
    const candidates = Array.from({ length: batchSize }, (_, index) =>
      generateVariationSku(parentCode, offset + index)
    ).filter((sku) => !locallyUsedSkus.has(sku));
    if (candidates.length === 0) continue;

    const persistedCollisions = await findPersistedCollisions(candidates);
    const availableSku = candidates.find(
      (sku) => !locallyUsedSkus.has(sku) && !persistedCollisions.has(sku)
    );
    if (availableSku) return availableSku;
  }

  throw new Error('Não foi possível reservar um SKU sequencial livre. Tente salvar novamente.');
};

/** Keeps list adapters consistent: preserve a commercial SKU, synthesize only when absent. */
export const resolveProductVariationSku = (
  sku: string | null | undefined,
  parentSku: string,
  index: number
): string =>
  normalizeProductVariationSku(sku, parentSku) ||
  `${parentSku}-${String(index + 1).padStart(2, '0')}`;
