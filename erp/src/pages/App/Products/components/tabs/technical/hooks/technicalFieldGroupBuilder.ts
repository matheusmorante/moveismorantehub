import type Product from '@/pages/types/product.type';
import type { CharacteristicGroup as PersistedCharacteristicGroup } from '@/pages/types/variation.type';
import {
  TechnicalFieldDefinition,
  isTechnicalFieldVariable,
} from '@/pages/utils/technicalValuesService';
import { normalizeSearchTerm } from '../rules/technicalTabUtils';
import {
  resolveProductCharacteristicApplication,
  type ProductCharacteristicGroupView,
} from '../rules/productCharacteristicGroupRules';

export interface ProductGroupBuilderParams {
  characteristicGroups: readonly PersistedCharacteristicGroup[];
  sofaTechnicalFields: readonly TechnicalFieldDefinition[];
  applicableFieldsByName: ReadonlyMap<string, TechnicalFieldDefinition>;
  dependencyReferenceIds: ReadonlySet<string>;
  formData: Partial<Product>;
  variableTechnicalFieldNames: readonly string[];
  isMultiVariationProduct: boolean;
  isCatalogRequiredForSelectedCategory: (field: TechnicalFieldDefinition) => boolean;
  hasStoredField: (field: TechnicalFieldDefinition) => boolean;
  isFieldRequired: (field: TechnicalFieldDefinition) => boolean;
  isFieldRequiredForProductEntry: (field: TechnicalFieldDefinition) => boolean;
  isFieldRequiredForCatalog: (field: TechnicalFieldDefinition) => boolean;
  isFieldRequiredForProductEntryLabel: (field: TechnicalFieldDefinition) => boolean;
  isFieldSelected: (field: TechnicalFieldDefinition) => boolean;
  isFieldActive: (field: TechnicalFieldDefinition) => boolean;
  isFieldDependencySatisfied: (
    field: TechnicalFieldDefinition
  ) => { satisfied: boolean; referenceIsVariable?: boolean };
}

/** Constrói a visão agrupada das características aplicáveis por categoria. */
export function buildProductCharacteristicGroupViews(
  params: ProductGroupBuilderParams
): ProductCharacteristicGroupView[] {
  const {
    characteristicGroups,
    sofaTechnicalFields,
    applicableFieldsByName,
    dependencyReferenceIds,
    formData,
    isCatalogRequiredForSelectedCategory,
    hasStoredField,
    isFieldRequired,
    isFieldRequiredForProductEntry,
    isFieldRequiredForCatalog,
    isFieldRequiredForProductEntryLabel,
    isFieldSelected,
    isFieldActive,
    isFieldDependencySatisfied,
  } = params;

  return characteristicGroups.map((group) => {
    const allGroupFields = sofaTechnicalFields
      .filter((field) => field.groupId === group.id)
      .filter((field) =>
        isCatalogRequiredForSelectedCategory(field) ||
        resolveProductCharacteristicApplication(field, formData.categoryIds || []) !== 'unavailable'
      )
      .filter((field) =>
        field.active !== false ||
        hasStoredField(field) ||
        isCatalogRequiredForSelectedCategory(field)
      );
    const categoryEnrichedGroupFields = allGroupFields.map((field) => ({
      ...field,
      ...applicableFieldsByName.get(normalizeSearchTerm(field.name)),
      groupName: group.name,
    }));
    const requiredIds = new Set(
      categoryEnrichedGroupFields.filter(isFieldRequired).map((field) => field.id)
    );
    const fields = categoryEnrichedGroupFields
      .filter((field) =>
        requiredIds.has(field.id) ||
        dependencyReferenceIds.has(field.id) ||
        (isFieldSelected(field) && isFieldActive(field))
      )
      .map((field) => {
        const dependency = isFieldDependencySatisfied(field);
        const required = requiredIds.has(field.id);
        const active = required || isFieldActive(field);
        return {
          ...field,
          isRequired: isFieldRequiredForProductEntry(field),
          isRequiredForCatalog: isFieldRequiredForCatalog(field),
          isRequiredForProductEntry: isFieldRequiredForProductEntryLabel(field),
          characteristicActive: active,
          characteristicToggleDisabled: required,
          dependencySatisfied: dependency.satisfied,
          dependencyReferenceIsVariable: dependency.referenceIsVariable,
        };
      })
      .filter((field) => field.dependencySatisfied !== false);
    return {
      ...group,
      fields,
      availableFields: categoryEnrichedGroupFields,
    };
  });
}

/** Projeta os campos de grupos que correspondem ao termo de busca digitado. */
export function buildMatchingProductGroupFields(params: {
  groupViews: readonly ProductCharacteristicGroupView[];
  canSearchProductGroups: boolean;
  normalizedDebouncedSearchTerm: string;
  isMultiVariationProduct: boolean;
  variableTechnicalFieldNames: readonly string[];
  hasStoredField: (field: TechnicalFieldDefinition) => boolean;
  isFieldRequired: (field: TechnicalFieldDefinition) => boolean;
  isFieldRequiredForProductEntry: (field: TechnicalFieldDefinition) => boolean;
  isFieldRequiredForCatalog: (field: TechnicalFieldDefinition) => boolean;
  isFieldRequiredForProductEntryLabel: (field: TechnicalFieldDefinition) => boolean;
  isFieldSelected: (field: TechnicalFieldDefinition) => boolean;
  isFieldActive: (field: TechnicalFieldDefinition) => boolean;
}) {
  const {
    groupViews,
    canSearchProductGroups,
    normalizedDebouncedSearchTerm,
    isMultiVariationProduct,
    variableTechnicalFieldNames,
    hasStoredField,
    isFieldRequired,
    isFieldRequiredForProductEntry,
    isFieldRequiredForCatalog,
    isFieldRequiredForProductEntryLabel,
    isFieldSelected,
    isFieldActive,
  } = params;

  const matchesSearch = (value: string) => {
    const tokens = normalizedDebouncedSearchTerm.split(/\s+/).filter(Boolean);
    const valueTokens = normalizeSearchTerm(value).split(/\s+/).filter(Boolean);
    return tokens.every((token) =>
      valueTokens.some((valueToken) => valueToken.startsWith(token))
    );
  };

  const matchingProductGroups = canSearchProductGroups
    ? groupViews.filter(
        (group) =>
          group.availableFields.length > 0 &&
          (matchesSearch(group.name) ||
            group.availableFields.some(
              (field) => field.groupId === group.id && matchesSearch(field.name)
            ))
      )
    : [];

  const matchingProductGroupFields = canSearchProductGroups
    ? matchingProductGroups.flatMap((group) => {
        const groupNameMatches = matchesSearch(group.name);
        return group.availableFields
          .filter((field) => field.active !== false || hasStoredField(field))
          .filter((field) => groupNameMatches || matchesSearch(field.name))
          .map((field) => {
            const required = isFieldRequired(field);
            const active = required || isFieldActive(field);
            return {
              field: {
                ...field,
                isRequired: isFieldRequiredForProductEntry(field),
                isRequiredForCatalog: isFieldRequiredForCatalog(field),
                isRequiredForProductEntry: isFieldRequiredForProductEntryLabel(field),
                characteristicActive: active,
                characteristicToggleDisabled: required,
              },
              scope:
                isMultiVariationProduct &&
                isTechnicalFieldVariable(field.name, variableTechnicalFieldNames)
                  ? ('variation' as const)
                  : active
                    ? ('global' as const)
                    : ('not_inform' as const),
              selected: required || isFieldSelected(field),
              active,
            };
          });
      })
    : [];

  return { matchingProductGroups, matchingProductGroupFields };
}
