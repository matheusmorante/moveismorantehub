import type Product from '@/pages/types/product.type';
import {
  isChairWeightCapacityCharacteristic,
  type TechnicalFieldDefinition,
} from '@/pages/utils/technicalValuesService';
import { isCatalogCoreRequiredCharacteristicName } from '../../../../../../../../../shared-utils/catalogPublication/characteristicValues';
import { isCatalogNeverRequiredCharacteristicName } from '../../../../../../../../../shared-utils/catalogPublication/requiredCharacteristicPolicy';
import { isTechnicalFieldAllowedForCategories } from '../../../../../../../../../shared-utils/productTechnicalFieldScope';
import { isSofaCategoryName } from '../../../../../../../../../shared-utils/productTechnicalFieldRules';
import { normalizeSearchTerm } from '../technicalTabUtils';
import {
  SOFA_ONLY_DIMENSION_NAMES,
  SOFA_ONLY_DIMENSION_DEFAULTS,
} from './sofaTechnicalConstants';
import { resolveProductCharacteristicApplication } from '../productCharacteristicGroupRules';

export const resolveTechnicalCategoryFields = (
  allTechnicalFields: readonly TechnicalFieldDefinition[],
  formData: Partial<Product>,
  categoryName: string
) => {
  const isSofaCategorySelected = isSofaCategoryName(categoryName);
  const isChairCategorySelected = /(?:^|[^a-z0-9])cadeiras?(?=$|[^a-z0-9])/i.test(
    normalizeSearchTerm(categoryName)
  );
  const selectedCategoryIds = new Set(formData.categoryIds || []);
  const hasSelectedCategoryApplication = (field: TechnicalFieldDefinition) =>
    field.categoryApplications?.some((application) =>
      selectedCategoryIds.has(String(application.categoryId))
    ) ?? false;
  const isCatalogRequiredForSelectedCategory = (field: TechnicalFieldDefinition) =>
    !isCatalogNeverRequiredCharacteristicName(field.name) && (
      Boolean(field.isRequiredForCatalog) ||
      isCatalogCoreRequiredCharacteristicName(field.name) ||
      (field.requiredCategoryIds?.some((id) =>
        selectedCategoryIds.has(String(id))
      ) ?? false)
    );

  const categoryTechnicalFields = allTechnicalFields
    .map((field) => {
      if (isCatalogNeverRequiredCharacteristicName(field.name)) {
        return { ...field, isRequired: false, isRequiredForCatalog: false };
      }
      const hasCategoryApplication = field.categoryApplications?.some((application) =>
        selectedCategoryIds.has(String(application.categoryId))
      ) ?? false;
      if (Array.isArray(field.categoryApplications)) {
        const application = resolveProductCharacteristicApplication(field, formData.categoryIds || []);
        return { ...field, isRequired: application === 'required' };
      }
      if (!hasCategoryApplication) return field;
      const application = resolveProductCharacteristicApplication(field, formData.categoryIds || []);
      return { ...field, isRequired: application === 'required' };
    })
    .filter((field) => {
      const hasCategoryApplication = field.categoryApplications?.some((application) =>
        selectedCategoryIds.has(String(application.categoryId))
      ) ?? false;
      if (Array.isArray(field.categoryApplications) &&
        resolveProductCharacteristicApplication(field, formData.categoryIds || []) === 'unavailable' &&
        !isCatalogRequiredForSelectedCategory(field)) {
        return false;
      }
      if (!isTechnicalFieldAllowedForCategories(
        field.name, [categoryName], field.categoryApplications, formData.categoryIds || []
      ) && !isCatalogCoreRequiredCharacteristicName(field.name)) return false;
      const linkedToSelectedCategory = field.categoryIds?.some((id) =>
        selectedCategoryIds.has(String(id))
      ) ?? false;
      const application = resolveProductCharacteristicApplication(field, formData.categoryIds || []);
      if (!linkedToSelectedCategory && !field.isRequired &&
        !isCatalogRequiredForSelectedCategory(field) &&
        !isChairWeightCapacityCharacteristic(field.name) && !hasCategoryApplication &&
        application !== 'optional') return false;
      if (isChairWeightCapacityCharacteristic(field.name)) {
        const isLinkedToSelectedCategory = field.categoryIds?.some((id) =>
          selectedCategoryIds.has(id)
        );
        if (!isChairCategorySelected && !isLinkedToSelectedCategory) return false;
      }

      return (
        hasCategoryApplication ||
        isSofaCategorySelected ||
        !SOFA_ONLY_DIMENSION_NAMES.has(normalizeSearchTerm(field.name))
      );
    });

  const sofaTechnicalFields = isSofaCategorySelected
    ? [
        ...categoryTechnicalFields,
        ...SOFA_ONLY_DIMENSION_DEFAULTS.filter(
          (defaultField) =>
            !allTechnicalFields.some(
              (field) => normalizeSearchTerm(field.name) === normalizeSearchTerm(defaultField.name)
            )
        ),
      ]
    : categoryTechnicalFields;

  return {
    isSofaCategorySelected,
    sofaTechnicalFields,
    hasSelectedCategoryApplication,
    isCatalogRequiredForSelectedCategory,
  };
};
