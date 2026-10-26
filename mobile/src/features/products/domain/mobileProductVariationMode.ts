type MobileProductVariationModeSource = {
  itemType?: unknown;
  item_type?: unknown;
  isDraft?: unknown;
  is_draft?: unknown;
  status?: unknown;
  hasVariations?: unknown;
  has_variations?: unknown;
  variations?: unknown;
  allVariations?: unknown;
};

type MobileProductCodeInitializationSource = {
  [key: string]: unknown;
  code?: string;
  itemType?: unknown;
  hasVariations?: unknown;
  variations?: unknown;
};

/** Applies a generated code without losing a mode selected while the request was pending. */
export const initializeMobileProductCode = <T extends MobileProductCodeInitializationSource>(
  product: T,
  generatedCode: string,
  defaultVariation: unknown
): T & { code: string; hasVariations: boolean; variations: unknown[] } => {
  const variations = Array.isArray(product.variations) ? product.variations : [];
  const hasVariations = product.itemType === 'service'
    ? false
    : Boolean(product.hasVariations) || variations.length > 1;

  return {
    ...product,
    code: String(product.code || generatedCode),
    hasVariations,
    variations: variations.length > 0 ? variations : [defaultVariation],
  };
};

/** Mirrors ERP mode mapping: drafts and non-product records retain their saved mode. */
export const resolveMobileProductHasVariations = (
  product: MobileProductVariationModeSource
): boolean => {
  const itemType = product.itemType ?? product.item_type ?? 'product';
  const isDraft = Boolean(product.isDraft || product.is_draft) || product.status === 'draft';
  const storedMode = Boolean(product.hasVariations ?? product.has_variations);
  if (isDraft || itemType !== 'product') return storedMode;

  const variations = Array.isArray(product.allVariations)
    ? product.allVariations
    : Array.isArray(product.variations)
      ? product.variations
      : [];
  return variations.length > 1;
};

/** Mirrors ERP form loading: completed non-service products derive mode from variation count. */
export const resolveMobileProductFormHasVariations = (
  product: MobileProductVariationModeSource
): boolean => {
  const itemType = product.itemType ?? product.item_type ?? 'product';
  const isDraft = Boolean(product.isDraft || product.is_draft) || product.status === 'draft';
  const storedMode = Boolean(product.hasVariations ?? product.has_variations);
  if (isDraft || itemType === 'service') return storedMode;

  const variations = Array.isArray(product.allVariations)
    ? product.allVariations
    : Array.isArray(product.variations)
      ? product.variations
      : [];
  return variations.length > 1;
};

/** Mirrors ERP getProductFormTabs: variation editing is available only in multi mode. */
export const shouldShowMobileProductVariationsTab = (
  product: MobileProductVariationModeSource
): boolean => {
  const itemType = product.itemType ?? product.item_type ?? 'product';
  if (itemType === 'service') return false;

  const hasVariations = Boolean(product.hasVariations ?? product.has_variations);
  const variations = Array.isArray(product.allVariations)
    ? product.allVariations
    : Array.isArray(product.variations)
      ? product.variations
      : [];
  return hasVariations || variations.length > 1;
};

/** Mirrors the ERP composition tab for a simple composition, not a composition family. */
export const shouldShowMobileProductCompositionTab = (
  product: MobileProductVariationModeSource
): boolean => {
  const itemType = product.itemType ?? product.item_type;
  return itemType === 'composition' && !shouldShowMobileProductVariationsTab(product);
};
