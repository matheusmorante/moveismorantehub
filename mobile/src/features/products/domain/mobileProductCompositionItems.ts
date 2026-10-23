type MobileProductCompositionSource = {
  combo_items?: unknown;
  comboItems?: unknown;
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
