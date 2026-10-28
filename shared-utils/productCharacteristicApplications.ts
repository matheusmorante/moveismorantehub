export type ProductCharacteristicApplication = 'unavailable' | 'optional' | 'required';

export interface ProductCategoryApplicationField {
  readonly categoryApplications?: readonly {
    readonly categoryId: string;
    readonly application: ProductCharacteristicApplication;
  }[];
  readonly categoryIds?: readonly string[];
  readonly requiredProductCategoryIds?: readonly string[];
  readonly isRequired?: boolean;
}

/** Resolve one characteristic's applicability for the product's selected categories. */
export const resolveProductCharacteristicApplication = (
  field: ProductCategoryApplicationField,
  categoryIds: readonly string[],
): ProductCharacteristicApplication => {
  const selectedCategories = new Set(categoryIds.map(String));
  const configuredApplications = field.categoryApplications?.filter((item) =>
    selectedCategories.has(String(item.categoryId))
  ) ?? [];

  if (configuredApplications.length > 0) {
    if (configuredApplications.some((item) => item.application === 'required')) return 'required';
    if (configuredApplications.some((item) => item.application === 'optional')) return 'optional';
  }

  if (Array.isArray(field.categoryApplications)) {
    // A newly added category without an explicit row keeps the ERP's optional default.
    if (selectedCategories.size > configuredApplications.length) return 'optional';
    return 'unavailable';
  }

  if (field.requiredProductCategoryIds?.some((id) => selectedCategories.has(String(id)))) {
    return 'required';
  }
  if (field.categoryIds?.some((id) => selectedCategories.has(String(id)))) return 'optional';
  if (field.isRequired) return 'required';

  return 'unavailable';
};
