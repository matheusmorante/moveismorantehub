export const shouldShowMobileProductPagination = (
  productCount: number,
  loading: boolean,
  refreshing: boolean,
): boolean => productCount > 0 && (!loading || refreshing);

export const getMobileCompositionEmptyHint = (canCreateComposition: boolean): string =>
  canCreateComposition
    ? 'Tente ajustar seus filtros ou adicione uma nova composição.'
    : 'Tente ajustar seus filtros para encontrar uma composição.';

type MobileProductCategorySource = {
  category_id?: unknown;
  product_categories?: unknown;
  category?: unknown;
};

const normalizeCategoryId = (value: unknown): string | null => {
  if (typeof value !== 'string' && typeof value !== 'number') return null;
  const id = String(value).trim();
  return id || null;
};

/** Mirrors the ERP mapper: normalized links take precedence over the legacy category_id. */
export const getMobileProductListCategoryIds = (product: MobileProductCategorySource): string[] => {
  const relations = Array.isArray(product.product_categories) ? product.product_categories : [];
  if (relations.length > 0) {
    return relations
      .map((relation: any) =>
        normalizeCategoryId(
          typeof relation === 'object' && relation !== null
            ? relation.category_id || relation.id || relation
            : relation
        )
      )
      .filter((id): id is string => Boolean(id));
  }

  const legacyId = normalizeCategoryId(product.category_id);
  return legacyId ? [legacyId] : [];
};

/** Resolves list labels from category IDs before using the legacy text column. */
export const getMobileProductListCategoryLabel = (
  product: MobileProductCategorySource,
  categoryNames: ReadonlyMap<string, string>,
  fallbackCategory = product.category
): string => {
  const linkedNames = getMobileProductListCategoryIds(product)
    .map((id) => categoryNames.get(id))
    .filter((name): name is string => Boolean(name));
  if (linkedNames.length > 0) return linkedNames.join(' | ');
  return typeof fallbackCategory === 'string' ? fallbackCategory : '';
};
