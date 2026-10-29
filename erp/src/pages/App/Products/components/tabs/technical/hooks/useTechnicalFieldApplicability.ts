import type Product from '@/pages/types/product.type';
import type { CharacteristicGroup as PersistedCharacteristicGroup } from '@/pages/types/variation.type';
import {
  TechnicalFieldDefinition,
  getApplicableTechnicalFields,
  groupTechnicalFields,
  mergeCharacteristicGroups,
  isYesNoValueActive,
  isChairWeightCapacityCharacteristic,
  getCharacteristicDependencyState,
  isTechnicalFieldVariable,
  resolveVariableTechnicalFieldNames,
} from '@/pages/utils/technicalValuesService';
import { isDependentCharacteristicVisible } from '../../../../../../../../../shared-utils/productCharacteristicDependencies';
import {
  evaluateCharacteristicDependencies,
  evaluateCharacteristicDependency,
  getCharacteristicDependencies,
} from '../../../../../../../../../shared-utils/characteristicDependencyRules';
import { isSofaCategoryName } from '../../../../../../../../../shared-utils/productTechnicalFieldRules';
import { isCatalogCoreRequiredCharacteristicName } from '../../../../../../../../../shared-utils/catalogPublication/characteristicValues';
import { isCatalogNeverRequiredCharacteristicName } from '../../../../../../../../../shared-utils/catalogPublication/requiredCharacteristicPolicy';
import {
  areTechnicalCharacteristicNamesEquivalent,
  isTechnicalFieldAllowedForCategories,
} from '../../../../../../../../../shared-utils/productTechnicalFieldScope';
import {
  normalizeSearchTerm,
  isOptionalFieldSelected,
} from '../technicalTabUtils';
import {
  getDisplayedOptionalFields,
  getMatchingOptionalFields,
  getMatchingTopicGroups,
} from '../technicalSearchUtils';
import {
  SOFA_ONLY_DIMENSION_NAMES,
  SOFA_RETRACTABLE_FIELD,
  SOFA_ONLY_DIMENSION_DEFAULTS,
  isRetractableCharacteristic,
  isOpenClosedSofaDepth,
} from './sofaTechnicalConstants';
import {
  resolveProductCharacteristicApplication,
  type ProductCharacteristicGroupView,
} from '../productCharacteristicGroupRules';

export interface UseTechnicalFieldApplicabilityParams {
  readonly allTechnicalFields: readonly TechnicalFieldDefinition[];
  readonly characteristicGroups: readonly PersistedCharacteristicGroup[];
  readonly formData: Partial<Product>;
  readonly categoryName?: string;
  readonly manualFieldNames: readonly string[];
  readonly requiredFieldsOnly?: boolean;
  readonly selectedCharacteristicIds?: readonly string[];
  readonly activeCharacteristicIds?: readonly string[];
  readonly characteristicSearchTerm: string;
  readonly debouncedCharacteristicSearchTerm: string;
}

export const useTechnicalFieldApplicability = ({
  allTechnicalFields,
  characteristicGroups,
  formData,
  categoryName = '',
  manualFieldNames,
  requiredFieldsOnly = false,
  selectedCharacteristicIds = [],
  activeCharacteristicIds,
  characteristicSearchTerm,
  debouncedCharacteristicSearchTerm,
}: UseTechnicalFieldApplicabilityParams) => {
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
        selectedCategoryIds.has(String(id)) && !field.categoryApplications?.some(
          (application) => String(application.categoryId) === String(id)
        )
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

  const retractableField =
    sofaTechnicalFields.find(
      (field) => isRetractableCharacteristic(field.name) && field.active !== false
    ) || (
      allTechnicalFields.some((field) => isRetractableCharacteristic(field.name))
        ? undefined
        : SOFA_RETRACTABLE_FIELD
    );

  const retractableValue = Object.entries(formData.technicalValues || {}).find(([name]) =>
    isRetractableCharacteristic(name)
  )?.[1];
  const isSofaRetractableActive =
    isSofaCategorySelected && isYesNoValueActive(retractableValue);

  const applicableFieldsForCategory = getApplicableTechnicalFields(
    sofaTechnicalFields,
    formData.categoryIds || [],
    formData.technicalValues || {},
    manualFieldNames,
    [categoryName]
  );

  const applicableFieldsByName = new Map<string, TechnicalFieldDefinition>(
    applicableFieldsForCategory.map(
      (field): [string, TechnicalFieldDefinition] => [normalizeSearchTerm(field.name), field]
    )
  );

  if (isSofaCategorySelected && retractableField) {
    applicableFieldsByName.set(normalizeSearchTerm(retractableField.name), {
      ...retractableField,
      isRequired: true,
    });

    if (isSofaRetractableActive) {
      SOFA_ONLY_DIMENSION_DEFAULTS.filter((field) =>
        isOpenClosedSofaDepth(field.name)
      ).forEach((defaultField) => {
        const registered = allTechnicalFields.find(
          (candidate) =>
            normalizeSearchTerm(candidate.name) === normalizeSearchTerm(defaultField.name)
        );
        if (registered && hasSelectedCategoryApplication(registered)) return;
        const field =
          sofaTechnicalFields.find(
            (candidate) =>
              normalizeSearchTerm(candidate.name) === normalizeSearchTerm(defaultField.name)
          ) || defaultField;
        applicableFieldsByName.set(normalizeSearchTerm(field.name), {
          ...field,
          isRequired: true,
        });
      });
    }
  }

  const applicableFields = Array.from(applicableFieldsByName.values()).map((field) => {
    if (!isSofaCategorySelected || hasSelectedCategoryApplication(field)) return field;
    if (isOpenClosedSofaDepth(field.name)) {
      return { ...field, isRequired: isSofaRetractableActive };
    }
    if (isRetractableCharacteristic(field.name)) return { ...field, isRequired: true };
    return field;
  });

  const categoryVisibleFields = requiredFieldsOnly
    ? applicableFields.filter((field) => field.isRequired || field.isRequiredForCatalog)
    : applicableFields;

  const requiredFields = categoryVisibleFields.filter((field) => field.isRequired);
  const catalogRequiredFields = categoryVisibleFields.filter(
    (field) => field.isRequiredForCatalog && !field.isRequired
  );
  const optionalFields = categoryVisibleFields.filter(
    (field) => !field.groupId && !field.isRequired && !field.isRequiredForCatalog
  );

  const normalizedSearchTerm = normalizeSearchTerm(characteristicSearchTerm);
  const normalizedDebouncedSearchTerm = normalizeSearchTerm(debouncedCharacteristicSearchTerm);

  const isMultiVariationProduct =
    Boolean(formData.hasVariations) || (formData.variations || []).length > 1;
  const technicalValues = formData.technicalValues || {};
  const variableTechnicalFieldNames = resolveVariableTechnicalFieldNames(
    formData.variableTechnicalFields,
    formData.variations || []
  );
  const selectedFieldIds = new Set(selectedCharacteristicIds);
  const activeFieldIds = new Set(activeCharacteristicIds ?? selectedCharacteristicIds);
  const dependencyReferenceIds = new Set<string>();

  const isFieldRequired = (field: TechnicalFieldDefinition) => {
    if (isCatalogNeverRequiredCharacteristicName(field.name)) return false;
    const categoryField = applicableFieldsByName.get(normalizeSearchTerm(field.name));
    return Boolean(
      field.isRequired ||
      field.isRequiredForCatalog ||
      categoryField?.isRequired ||
      categoryField?.isRequiredForCatalog
    );
  };

  const isDependencyReferenceGroupActive = (field: TechnicalFieldDefinition): boolean => {
    const categoryField = applicableFieldsByName.get(normalizeSearchTerm(field.name));
    if (!categoryField) return false;
    return isFieldRequired(categoryField) || isFieldActive(field);
  };

  const getFieldValue = (
    field: TechnicalFieldDefinition,
    variation?: NonNullable<Product['variations']>[number]
  ): unknown => {
    if (variation) {
      const variationEntry = Object.entries(variation.technicalValues || {}).find(([name]) =>
        areTechnicalCharacteristicNamesEquivalent(name, field.name)
      );
      if (variationEntry) return variationEntry[1];
      const attribute = variation.attributes?.find((item) =>
        areTechnicalCharacteristicNamesEquivalent(item.name, field.name)
      );
      return attribute?.value;
    }

    const productEntry = Object.entries(technicalValues).find(([name]) =>
      areTechnicalCharacteristicNamesEquivalent(name, field.name)
    );
    return productEntry?.[1];
  };

  const isConfiguredDependencySatisfied = (
    field: TechnicalFieldDefinition,
    variation: NonNullable<Product['variations']>[number] | undefined,
    visited = new Set<string>()
  ): boolean => {
    if (visited.has(field.id)) return false;
    const nextVisited = new Set(visited).add(field.id);
    if (!field.dependency) {
      const legacyDependency = getCharacteristicDependencyState(
        field.name,
        variation ? { ...technicalValues, ...(variation.technicalValues || {}) } : technicalValues
      );
      return !legacyDependency.isDependent || !legacyDependency.isDisabled;
    }

      return evaluateCharacteristicDependencies(
        getCharacteristicDependencies(field),
        field.dependencyLogic,
        (dependency) => {
          const reference = allTechnicalFields.find((candidate) => candidate.id === dependency.referenceAttributeId);
          if (!reference || !isDependencyReferenceGroupActive(reference) ||
              !isConfiguredDependencySatisfied(reference, variation, nextVisited)) return false;
          const referenceIsVariable = isMultiVariationProduct &&
            isTechnicalFieldVariable(reference.name, variableTechnicalFieldNames);
          return evaluateCharacteristicDependency(dependency, reference.dataType,
            getFieldValue(reference, referenceIsVariable ? variation : undefined));
        }
      );
  };

  const isFieldDependencySatisfied = (
    field: TechnicalFieldDefinition
  ): { satisfied: boolean; referenceIsVariable: boolean } => {
    if (!field.dependency) {
      const legacyDependency = getCharacteristicDependencyState(field.name, technicalValues);
      return { satisfied: !legacyDependency.isDependent || !legacyDependency.isDisabled, referenceIsVariable: false };
    }

    const referenceIsVariable = isMultiVariationProduct && getCharacteristicDependencies(field).some((dependency) => {
      const reference = allTechnicalFields.find((candidate) => candidate.id === dependency.referenceAttributeId);
      return reference && isTechnicalFieldVariable(reference.name, variableTechnicalFieldNames);
    });
    const variations = (formData.variations || []).filter((variation) => variation.active !== false);
    const contexts = referenceIsVariable && variations.length > 0 ? variations : [undefined];
    return {
      satisfied: contexts.some((variation) =>
        isConfiguredDependencySatisfied(field, variation)
      ),
      referenceIsVariable,
    };
  };

  const isNotInformValue = (value: unknown) =>
    typeof value === 'string' &&
    ['não informar', 'nao informar', 'não se aplica', 'nao se aplica', 'n/a'].includes(
      normalizeSearchTerm(value)
    );
  const hasStoredField = (field: TechnicalFieldDefinition) => {
    const hasActiveValue = (values?: Record<string, unknown>) =>
      Object.entries(values || {}).some(([name, value]) =>
        areTechnicalCharacteristicNamesEquivalent(name, field.name) && !isNotInformValue(value)
      );
    return hasActiveValue(technicalValues) || (formData.variations || []).some(
      (variation) =>
        hasActiveValue(variation.technicalValues) ||
        (variation.attributes || []).some((attribute) =>
          areTechnicalCharacteristicNamesEquivalent(attribute.name, field.name) &&
          !isNotInformValue(attribute.value)
        )
    ) || isTechnicalFieldVariable(field.name, variableTechnicalFieldNames);
  };
  const isFieldSelected = (field: TechnicalFieldDefinition) =>
    selectedFieldIds.has(field.id) ||
    (!Array.isArray(formData.selectedCharacteristicIds) && hasStoredField(field));
  const isFieldActive = (field: TechnicalFieldDefinition) =>
    activeFieldIds.has(field.id) ||
    (!Array.isArray(formData.activeCharacteristicIds) && hasStoredField(field));
  const addDependencyReferences = (field: TechnicalFieldDefinition, visited = new Set<string>()) => {
    if (visited.has(field.id)) return;
    const nextVisited = new Set(visited).add(field.id);
    for (const dependency of getCharacteristicDependencies(field)) {
      const reference = allTechnicalFields.find((candidate) => candidate.id === dependency.referenceAttributeId);
      if (!reference || !applicableFieldsByName.has(normalizeSearchTerm(reference.name))) continue;
      dependencyReferenceIds.add(reference.id);
      addDependencyReferences(reference, nextVisited);
    }
  };
  applicableFields
    .filter((field) => isFieldRequired(field) || (isFieldSelected(field) && isFieldActive(field)))
    .forEach((field) => addDependencyReferences(field));

  const dependencyAwareFields = categoryVisibleFields.filter(
    (field) => isFieldDependencySatisfied(field).satisfied
  );
  const dependencyReferenceFields = applicableFields.filter((field) =>
    dependencyReferenceIds.has(field.id)
  );
  const dependencyVisibleReferenceFields = dependencyReferenceFields
    .filter((field) => isFieldDependencySatisfied(field).satisfied)
    .map((field) => {
      const required = isFieldRequired(field);
      const active = required || isFieldActive(field);
      return {
        ...field,
        isRequired: required,
        isRequiredForProductEntry: false,
        characteristicActive: active,
        characteristicToggleDisabled: required,
      };
    });
  const dependencyVisibleRequiredFields = [
    ...requiredFields.filter((field) => isFieldDependencySatisfied(field).satisfied),
  ].filter((field, index, fields) => fields.findIndex((candidate) => candidate.id === field.id) === index);
  const dependencyVisibleCatalogRequiredFields = catalogRequiredFields.filter(
    (field) => isFieldDependencySatisfied(field).satisfied
  );
  const requiredFieldGroups = groupTechnicalFields([
    ...dependencyVisibleRequiredFields,
    ...dependencyVisibleCatalogRequiredFields,
  ].filter((field) => !field.groupId));
  const dependencyVisibleOptionalFields = optionalFields.filter(
    (field) => isFieldDependencySatisfied(field).satisfied
  );
  const groupViews: ProductCharacteristicGroupView[] = characteristicGroups.map((group) => {
    const allGroupFields = sofaTechnicalFields
      .filter((field) => field.groupId === group.id)
      .filter((field) =>
        isCatalogCoreRequiredCharacteristicName(field.name) ||
        resolveProductCharacteristicApplication(field, formData.categoryIds || []) !== 'unavailable' ||
        (isCatalogRequiredForSelectedCategory(field) && !(field.categoryApplications?.some((application) =>
          selectedCategoryIds.has(String(application.categoryId))
        ) ?? false))
      )
      .filter((field) => field.active !== false || hasStoredField(field));
    const categoryEnrichedGroupFields = allGroupFields.map((field) => ({
      ...field,
      ...applicableFieldsByName.get(normalizeSearchTerm(field.name)),
      groupName: group.name,
    }));
    const requiredIds = new Set(categoryEnrichedGroupFields.filter(isFieldRequired).map((field) => field.id));
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
          isRequired: required,
          isRequiredForCatalog: Boolean(field.isRequiredForCatalog),
          isRequiredForProductEntry: false,
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

  const productGroupSections = groupViews.filter((group) => group.fields.length > 0);
  const hasExplicitValue = (field: TechnicalFieldDefinition) => {
    const entry = Object.entries(technicalValues).find(
      ([name]) => areTechnicalCharacteristicNamesEquivalent(name, field.name)
    );
    if (!entry) return false;

    const value = entry[1];
    if (typeof value === 'string') {
      const normalizedValue = normalizeSearchTerm(value);
      if (!normalizedValue) {
        // Campo opcional vazio é o marcador persistido do botão Global ligado.
        return !field.isRequired && !field.isRequiredForCatalog;
      }
      return !['nao se aplica', 'n/a', 'nao informar'].includes(normalizedValue);
    }
    if (Array.isArray(value)) return value.length > 0;
    return value !== undefined && value !== null;
  };
  const isGloballySelected = (field: TechnicalFieldDefinition) =>
    hasExplicitValue(field) || isOptionalFieldSelected(field, formData, []);

  const isOptionalFieldActive = (field: TechnicalFieldDefinition): boolean => {
    const dependency = getCharacteristicDependencyState(field.name, technicalValues);
    if (!dependency.isDependent) {
      return (
        isGloballySelected(field) ||
        (isMultiVariationProduct &&
          isTechnicalFieldVariable(field.name, variableTechnicalFieldNames))
      );
    }

    const masterField = dependency.masterFieldLabel
      ? allTechnicalFields.find(
          (candidate) =>
            areTechnicalCharacteristicNamesEquivalent(
              candidate.name,
              dependency.masterFieldLabel!
            )
        )
      : undefined;
    return isDependentCharacteristicVisible(dependency, {
      masterFieldExists: Boolean(masterField),
      masterIsVariable: isMultiVariationProduct && masterField
        ? isTechnicalFieldVariable(masterField.name, variableTechnicalFieldNames)
        : false,
      masterIsSelected: masterField ? isGloballySelected(masterField) : false,
    });
  };

  const filledOrManualOptionalFields = dependencyVisibleOptionalFields.filter((field) => {
    return (isFieldSelected(field) && isFieldActive(field)) ||
      manualFieldNames.includes(field.name) ||
      isOptionalFieldActive(field);
  });

  const displayedOptionalFields = getDisplayedOptionalFields({
    requiredFieldsOnly,
    optionalFields: dependencyVisibleOptionalFields,
    allTechnicalFields,
    filledOrManualOptionalFields,
    normalizedSearchTerm,
  });

  const matchingOptionalFields = getMatchingOptionalFields(
    sofaTechnicalFields.filter((field) => !field.groupId),
    [...dependencyVisibleRequiredFields, ...dependencyVisibleCatalogRequiredFields].filter((field) => !field.groupId),
    displayedOptionalFields,
    requiredFieldsOnly,
    normalizedSearchTerm,
    normalizedDebouncedSearchTerm,
    3,
    technicalValues,
    [categoryName],
    formData.categoryIds || []
  );

  const matchingGroups = getMatchingTopicGroups(
    requiredFieldsOnly,
    normalizedSearchTerm,
    normalizedDebouncedSearchTerm
  );

  const canSearchProductGroups =
    !requiredFieldsOnly &&
    normalizedSearchTerm.length >= 3 &&
    normalizedSearchTerm === normalizedDebouncedSearchTerm;
  const matchesSearch = (value: string) => {
    const tokens = normalizedDebouncedSearchTerm.split(/\s+/).filter(Boolean);
    const valueTokens = normalizeSearchTerm(value).split(/\s+/).filter(Boolean);
    return tokens.every((token) =>
      valueTokens.some((valueToken) => valueToken.startsWith(token))
    );
  };
  const searchableGroupViews = groupViews;
  const matchingProductGroups = canSearchProductGroups
    ? searchableGroupViews
        .filter((group) => group.availableFields.length > 0 && (
          matchesSearch(group.name) ||
          group.availableFields.some(
            (field) => field.groupId === group.id && matchesSearch(field.name)
          )
        ))
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
                isRequired: required,
                isRequiredForProductEntry: false,
                characteristicActive: active,
                characteristicToggleDisabled: required,
              },
              scope: isMultiVariationProduct &&
                isTechnicalFieldVariable(field.name, variableTechnicalFieldNames)
                ? 'variation' as const
                : active
                  ? 'global' as const
                  : 'not_inform' as const,
              selected: required || isFieldSelected(field),
              active,
            };
          });
      })
    : [];

  const legacyVisibleFields = [
    ...dependencyAwareFields,
    ...dependencyVisibleRequiredFields,
    ...(!requiredFieldsOnly ? dependencyVisibleReferenceFields : []),
  ].filter((field, index, fields) =>
    !field.groupId && fields.findIndex((candidate) => candidate.id === field.id) === index
  );
  const visibleFields = [
    ...productGroupSections.flatMap((group) => group.fields),
    ...(requiredFieldsOnly
      ? legacyVisibleFields
      : [...legacyVisibleFields, ...displayedOptionalFields]),
  ].filter((field, index, fields) => fields.findIndex((candidate) => candidate.id === field.id) === index);

  const fieldGroups = requiredFieldsOnly
    ? requiredFieldGroups
    : mergeCharacteristicGroups([
        ...requiredFieldGroups,
        ...groupTechnicalFields([
          ...dependencyVisibleReferenceFields.filter((field) => !field.groupId),
          ...displayedOptionalFields,
        ]),
      ]);

  return {
    isSofaCategorySelected,
    sofaTechnicalFields,
    visibleFields,
    requiredFields: dependencyVisibleRequiredFields,
    requiredFieldGroups,
    optionalFields: dependencyVisibleOptionalFields,
    displayedOptionalFields,
    productGroupSections,
    matchingProductGroups,
    matchingProductGroupFields,
    matchingOptionalFields,
    matchingGroups,
    fieldGroups,
    normalizedSearchTerm,
    normalizedDebouncedSearchTerm,
  };
};
