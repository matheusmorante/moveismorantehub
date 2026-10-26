export interface ProductCompositionShape {
  readonly active?: unknown;
  readonly itemType?: unknown;
  readonly item_type?: unknown;
  readonly isCombo?: unknown;
  readonly is_combo?: unknown;
  readonly hasVariations?: unknown;
  readonly has_variations?: unknown;
  readonly comboItems?: unknown;
  readonly combo_items?: unknown;
  readonly variations?: readonly ProductCompositionVariationShape[] | null;
}

export interface ProductCompositionVariationShape {
  readonly active?: unknown;
  readonly comboItems?: unknown;
  readonly combo_items?: unknown;
}

export const PRODUCT_COMPOSITION_MINIMUM_COMPONENTS = 2;
export const PRODUCT_COMPOSITION_PRODUCT_COMPONENTS_REQUIRED_MESSAGE =
  'Vincule pelo menos 2 produtos componentes para manter ativa esta composição.';
export const PRODUCT_COMPOSITION_VARIATION_COMPONENTS_REQUIRED_MESSAGE =
  'Vincule pelo menos 2 produtos componentes para manter ativa esta variação de composição.';

export const isProductComposition = (product: ProductCompositionShape): boolean =>
  product.itemType === 'composition' ||
  product.item_type === 'composition' ||
  product.isCombo === true ||
  product.is_combo === true;

export const hasMinimumCompositionComponents = (items: unknown): boolean =>
  Array.isArray(items) && items.length >= PRODUCT_COMPOSITION_MINIMUM_COMPONENTS;

/** A simple active composition stores its parts on the product and its primary variation. */
export const getActiveCompositionProductRequirementIssue = (
  product: ProductCompositionShape
): { message: string; tab: 'composicao' } | null => {
  const variations = Array.isArray(product.variations) ? product.variations : [];
  const isMultiVariationMode = Boolean(product.hasVariations ?? product.has_variations) || variations.length > 1;
  if (!isProductComposition(product) || product.active === false || isMultiVariationMode) return null;

  const primaryVariation = variations[0];
  const primaryVariationItems = primaryVariation?.comboItems ?? primaryVariation?.combo_items;
  const rootItems = product.comboItems ?? product.combo_items;
  const items = Array.isArray(primaryVariationItems) && primaryVariationItems.length > 0
    ? primaryVariationItems
    : rootItems;

  return hasMinimumCompositionComponents(items)
    ? null
    : { message: PRODUCT_COMPOSITION_PRODUCT_COMPONENTS_REQUIRED_MESSAGE, tab: 'composicao' };
};

/** Applies only to active family variations; a simple composition stores its parts on the product. */
export const getActiveCompositionVariationRequirementIssue = (
  parent: ProductCompositionShape & { readonly variations?: readonly unknown[] | null },
  variation: ProductCompositionVariationShape
): { message: string; tab: 'compostos' } | null => {
  if (
    !isProductComposition(parent) ||
    (parent.variations?.length || 0) < 2 ||
    variation.active === false
  ) {
    return null;
  }

  const items = variation.comboItems ?? variation.combo_items;
  return hasMinimumCompositionComponents(items)
    ? null
    : { message: PRODUCT_COMPOSITION_VARIATION_COMPONENTS_REQUIRED_MESSAGE, tab: 'compostos' };
};
