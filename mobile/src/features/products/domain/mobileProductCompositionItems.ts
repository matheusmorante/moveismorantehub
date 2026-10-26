type MobileProductCompositionSource = {
  combo_items?: unknown;
  comboItems?: unknown;
  allVariations?: unknown;
  variations?: unknown;
};

type MobileVariationCompositionSource = {
  combo_items?: unknown;
  comboItems?: unknown;
};

type MobileProductFormCompositionState = {
  comboItems?: unknown;
  variations?: readonly Record<string, unknown>[] | null;
};

/** Stores the simple-composition editor value in both product and primary-variation payloads. */
export const synchronizeMobileProductFormCompositionItems = <T extends MobileProductFormCompositionState>(
  product: T,
  items: unknown[]
): T => {
  const next = { ...product, comboItems: items };
  if (!Array.isArray(next.variations) || next.variations.length !== 1) return next as T;

  const variations = [...next.variations];
  variations[0] = { ...variations[0], comboItems: items };
  return { ...next, variations } as T;
};

export const parseMobileCompositionItems = (value: unknown): any[] => {
  if (Array.isArray(value)) return value;
  if (typeof value !== 'string') return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

/** Keeps parent-level fallback ingredients separate from variation-level ingredients. */
export const getMobileProductRootCompositionItems = (
  product: MobileProductCompositionSource
): any[] => parseMobileCompositionItems(product.comboItems ?? product.combo_items);

/** Matches the ERP simple-composition editor: prefer primary variation items, then parent fallback. */
export const getMobileProductFormCompositionItems = (
  product: MobileProductCompositionSource,
  isSimpleComposition: boolean
): any[] => {
  const rootItems = getMobileProductRootCompositionItems(product);
  if (!isSimpleComposition) return rootItems;

  const variations = Array.isArray(product.allVariations)
    ? product.allVariations
    : Array.isArray(product.variations)
      ? product.variations
      : [];
  const primaryVariation = variations[0] as MobileVariationCompositionSource | undefined;
  const primaryItems = parseMobileCompositionItems(
    primaryVariation?.comboItems ?? primaryVariation?.combo_items
  );
  return primaryItems.length ? primaryItems : rootItems;
};
