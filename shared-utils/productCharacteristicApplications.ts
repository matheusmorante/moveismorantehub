import { isCatalogNeverRequiredCharacteristicName } from './catalogPublication/requiredCharacteristicPolicy';

export type ProductCharacteristicApplication = 'unavailable' | 'optional' | 'required';

export interface ProductCategoryApplicationField {
  readonly name?: string;
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
  const neverRequired = Boolean(
    field.name && isCatalogNeverRequiredCharacteristicName(field.name)
  );

  if (configuredApplications.length > 0) {
    if (configuredApplications.some((item) => item.application === 'required')) {
      return neverRequired ? 'optional' : 'required';
    }
    if (configuredApplications.some((item) => item.application === 'optional')) return 'optional';
  }

  if (Array.isArray(field.categoryApplications)) {
    // A newly added category without an explicit row keeps the ERP's optional default.
    if (selectedCategories.size > configuredApplications.length) return 'optional';
    return 'unavailable';
  }

  if (field.requiredProductCategoryIds?.some((id) => selectedCategories.has(String(id)))) {
    return neverRequired ? 'optional' : 'required';
  }
  if (field.categoryIds?.some((id) => selectedCategories.has(String(id)))) return 'optional';
  if (field.isRequired) return neverRequired ? 'optional' : 'required';

  return 'unavailable';
};
