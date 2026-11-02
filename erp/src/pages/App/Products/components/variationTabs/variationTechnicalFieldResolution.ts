import type Product from '../../../../types/product.type';
import type { Variation } from '../../../../types/product.type';
import type { TechnicalFieldDefinition } from '@/pages/utils/technicalValuesService';
import {
  getCharacteristicDependencyState,
  hasVariationOverride,
  isDepthCharacteristic,
  isChairWeightCapacityCharacteristic,
} from '@/pages/utils/technicalValuesService';
import {
  areTechnicalCharacteristicNamesEquivalent,
  isTechnicalFieldAllowedForCategories,
} from '../../../../../../../shared-utils/productTechnicalFieldScope';
import { isCatalogCoreRequiredCharacteristicName } from '../../../../../../../shared-utils/catalogPublication/characteristicValues';
import { isCatalogNeverRequiredCharacteristicName } from '../../../../../../../shared-utils/catalogPublication/requiredCharacteristicPolicy';
import {
  evaluateCharacteristicDependencies,
  evaluateCharacteristicDependency,
  getCharacteristicDependencies,
} from '../../../../../../../shared-utils/characteristicDependencyRules';
import { resolveProductCharacteristicApplication } from '../tabs/technical/productCharacteristicGroupRules';

export const normalizeSearchTerm = (value: string): string =>
  value
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pt-BR');

type ResolveVisibleVariationTechnicalFieldsParams = {
  readonly allTechnicalFields: TechnicalFieldDefinition[];
  readonly fieldsWithGroupNames: TechnicalFieldDefinition[];
  readonly applicableFields: TechnicalFieldDefinition[];
  readonly isChairCategorySelected: boolean;
  readonly isSofaCategorySelected: boolean;
  readonly isVariableField: (fieldName: string) => boolean;
  readonly parentProduct: Product & { readonly attributes?: Variation['attributes'] };
  readonly formData: Variation & { readonly material?: string | null };
  readonly variationAttributeValues: Record<string, any>;
  readonly parentNormalizedValues: Record<string, any>;
  readonly dependencyValues: Record<string, any>;
};

export const resolveVisibleVariationTechnicalFields = ({
  allTechnicalFields,
  fieldsWithGroupNames,
  applicableFields,
  isChairCategorySelected,
  isSofaCategorySelected,
  isVariableField,
  parentProduct,
  formData,
  variationAttributeValues,
  parentNormalizedValues,
  dependencyValues,
}: ResolveVisibleVariationTechnicalFieldsParams): TechnicalFieldDefinition[] => {
  const fieldsByName = new Map<string, TechnicalFieldDefinition>();
  const selectedCategoryIds = new Set(parentProduct.categoryIds || []);
  const selectedFieldIds = new Set(parentProduct.selectedCharacteristicIds || []);
  const activeFieldIds = new Set(
    parentProduct.activeCharacteristicIds ?? parentProduct.selectedCharacteristicIds ?? []
  );
  const hasExplicitActiveFieldIds = Array.isArray(parentProduct.activeCharacteristicIds);
  const isRequiredInCategory = (field: TechnicalFieldDefinition) => {
    if (isCatalogNeverRequiredCharacteristicName(field.name)) return false;
    if (isCatalogCoreRequiredCharacteristicName(field.name)) return true;
    const application = resolveProductCharacteristicApplication(field, parentProduct.categoryIds || []);
    const hasCategoryApplication = field.categoryApplications?.some((item) =>
      selectedCategoryIds.has(String(item.categoryId))
    ) ?? false;
    if (hasCategoryApplication) return application === 'required';
    return application === 'required' || Boolean(
      field.isRequiredForCatalog ||
      field.requiredCategoryIds?.some((id) => selectedCategoryIds.has(String(id)))
    );
  };
  const getGroupFieldState = (field: TechnicalFieldDefinition) => {
    const application = resolveProductCharacteristicApplication(field, parentProduct.categoryIds || []);
    const required = isRequiredInCategory(field);
    if (application === 'unavailable' && !required) return { visible: false, required: false };
    const hasStoredValue =
      hasVariationOverride(parentProduct.technicalValues, field.name) ||
      (parentProduct.variations || []).some((variation) =>
        hasVariationOverride(variation.technicalValues, field.name) ||
        variation.attributes?.some((attribute) =>
          normalizeSearchTerm(attribute.name) === normalizeSearchTerm(field.name)
        )
      );

    const isInSelectedScope = isVariableField(field.name);
    const fieldSelected = required || selectedFieldIds.has(field.id) ||
      (!Array.isArray(parentProduct.selectedCharacteristicIds) && (hasStoredValue || isInSelectedScope));
    const fieldActive = required || activeFieldIds.has(field.id) ||
      (!hasExplicitActiveFieldIds && (hasStoredValue || isInSelectedScope));
    return {
      visible: fieldSelected && fieldActive && (field.active !== false || hasStoredValue || isInSelectedScope),
      required,
    };
  };

  const readValue = (values: Record<string, unknown> | undefined, name: string) =>
    Object.entries(values || {}).find(([candidate]) =>
      areTechnicalCharacteristicNamesEquivalent(candidate, name)
    )?.[1];
  const readVariationValue = (name: string) => {
    const technicalEntry = Object.entries(formData.technicalValues || {}).find(([candidate]) =>
      areTechnicalCharacteristicNamesEquivalent(candidate, name)
    );
    return technicalEntry
      ? technicalEntry[1]
      : readValue(variationAttributeValues, name);
  };
  const isDependencySatisfied = (
    field: TechnicalFieldDefinition,
    visited = new Set<string>()
  ): boolean => {
    if (visited.has(field.id)) return false;
    const nextVisited = new Set(visited).add(field.id);
    if (field.dependency) {
      return evaluateCharacteristicDependencies(
        getCharacteristicDependencies(field),
        field.dependencyLogic,
        (dependency) => {
          const reference = allTechnicalFields.find((candidate) => candidate.id === dependency.referenceAttributeId);
          if (!reference || !getGroupFieldState(reference).visible || !isDependencySatisfied(reference, nextVisited)) return false;
          const referenceValue = isVariableField(reference.name)
            ? readVariationValue(reference.name)
            : readValue(parentNormalizedValues, reference.name);
          return evaluateCharacteristicDependency(dependency, reference.dataType, referenceValue);
        }
      );
    }

    const legacyDependency = getCharacteristicDependencyState(field.name, dependencyValues);
    return !legacyDependency.isDependent || !legacyDependency.isDisabled;
  };

  [...applicableFields, ...fieldsWithGroupNames].forEach((field) => {
    if (!isTechnicalFieldAllowedForCategories(
      field.name,
      [parentProduct.category || ''],
      field.categoryApplications,
      parentProduct.categoryIds || []
    ) && !isCatalogCoreRequiredCharacteristicName(field.name)) {
      return;
    }
    const groupState = getGroupFieldState(field);
    if (!groupState.visible) return;
    if (!isDependencySatisfied(field)) return;
    if (
      isChairWeightCapacityCharacteristic(field.name) &&
      !isChairCategorySelected &&
      !field.categoryIds?.some((id) => selectedCategoryIds.has(id))
    ) {
      return;
    }
    if (!isVariableField(field.name)) return;
    const key = normalizeSearchTerm(field.name);
    if (!fieldsByName.has(key)) {
      const visibleField =
        isSofaCategorySelected && isDepthCharacteristic(field.name)
          ? { ...field, isRequired: false, isRequiredForCatalog: false }
          : field;
      const requiredField = groupState.required
        ? { ...visibleField, isRequired: true }
        : visibleField;
      fieldsByName.set(
        key,
        requiredField
      );
    }
  });
  return [...fieldsByName.values()];
};
