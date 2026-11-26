import type Product from '@/pages/types/product.type';
import type { CharacteristicGroup as PersistedCharacteristicGroup } from '@/pages/types/variation.type';
import {
  TechnicalFieldDefinition,
  getApplicableTechnicalFields,
  groupTechnicalFields,
  mergeCharacteristicGroups,
  isYesNoValueActive,
  getCharacteristicDependencyState,
  isTechnicalFieldVariable,
  resolveVariableTechnicalFieldNames,
} from '@/pages/utils/technicalValuesService';
import { isDependentCharacteristicVisible } from '../../../../../../../../../shared-utils/productCharacteristicDependencies';
import {
  getCharacteristicDependencies,
} from '../../../../../../../../../shared-utils/characteristicDependencyRules';
import { isCatalogNeverRequiredCharacteristicName } from '../../../../../../../../../shared-utils/catalogPublication/requiredCharacteristicPolicy';
import {
  isDresserOrWardrobeRequiredCharacteristic,
  areTechnicalCharacteristicNamesEquivalent,
} from '../../../../../../../../../shared-utils/productTechnicalFieldScope';
import {
  normalizeSearchTerm,
  isOptionalFieldSelected,
} from '../rules/technicalTabUtils';
import {
  getDisplayedOptionalFields,
  getMatchingOptionalFields,
  getMatchingTopicGroups,
} from '../search/technicalSearchUtils';
import {
  SOFA_ONLY_DIMENSION_DEFAULTS,
  SOFA_RETRACTABLE_FIELD,
  isRetractableCharacteristic,
  isOpenClosedSofaDepth,
} from './sofaTechnicalConstants';
import { createTechnicalFieldDependencyResolver } from './technicalFieldDependencyResolver';
import { resolveTechnicalCategoryFields } from './technicalCategoryFieldResolver';
import {
  buildMatchingProductGroupFields,
  buildProductCharacteristicGroupViews,
} from './technicalFieldGroupBuilder';

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
  const {
    isSofaCategorySelected,
    isDresserOrWardrobeCategorySelected,
    sofaTechnicalFields,
    hasSelectedCategoryApplication,
    isCatalogRequiredForSelectedCategory,
  } = resolveTechnicalCategoryFields(allTechnicalFields, formData, categoryName);

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
      (field): [string, TechnicalFieldDefinition] => [
        normalizeSearchTerm(field.name),
        {
          ...field,
          isRequiredForCatalog: isCatalogRequiredForSelectedCategory(field),
        },
      ]
    )
  );

  if (isSofaCategorySelected && retractableField) {
    applicableFieldsByName.set(normalizeSearchTerm(retractableField.name), {
      ...retractableField,
      isRequired: false,
      isRequiredForProductEntry: false,
      isRequiredForCatalog: true,
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
          isRequired: false,
          isRequiredForProductEntry: false,
          isRequiredForCatalog: true,
        });
      });
    }
  }

  const applicableFields = Array.from(applicableFieldsByName.values()).map((field) => {
    if (!isSofaCategorySelected || hasSelectedCategoryApplication(field)) return field;
    if (isOpenClosedSofaDepth(field.name)) {
      return {
        ...field,
        isRequired: false,
        isRequiredForProductEntry: false,
        isRequiredForCatalog: isSofaRetractableActive,
      };
    }
    if (isRetractableCharacteristic(field.name)) {
      return {
        ...field,
        isRequired: false,
        isRequiredForProductEntry: false,
        isRequiredForCatalog: true,
      };
    }
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

  const isFieldRequiredForProductEntry = (field: TechnicalFieldDefinition) => {
    if (
      isCatalogNeverRequiredCharacteristicName(field.name) &&
      !(isDresserOrWardrobeCategorySelected && isDresserOrWardrobeRequiredCharacteristic(field.name))
    ) return false;
    const categoryField = applicableFieldsByName.get(normalizeSearchTerm(field.name));
    const fieldRequiredForProduct = Array.isArray(field.categoryApplications)
      ? field.isRequiredForProductEntry
      : field.isRequired;
    return Boolean(
      fieldRequiredForProduct ||
      field.isRequiredForProductEntry ||
      categoryField?.isRequired ||
      categoryField?.isRequiredForProductEntry ||
      (isDresserOrWardrobeCategorySelected && isDresserOrWardrobeRequiredCharacteristic(field.name))
    );
  };
  const isFieldRequiredForCatalog = (field: TechnicalFieldDefinition) => {
    if (
      isCatalogNeverRequiredCharacteristicName(field.name) &&
      !(isDresserOrWardrobeCategorySelected && isDresserOrWardrobeRequiredCharacteristic(field.name))
    ) return false;
    const categoryField = applicableFieldsByName.get(normalizeSearchTerm(field.name));
    return Boolean(
      field.isRequiredForCatalog ||
      isCatalogRequiredForSelectedCategory(field) ||
      categoryField?.isRequiredForCatalog
    );
  };
  const isFieldRequired = (field: TechnicalFieldDefinition) =>
    isFieldRequiredForProductEntry(field) || isFieldRequiredForCatalog(field);
  const isFieldRequiredForProductEntryLabel = (field: TechnicalFieldDefinition) =>
    Boolean(
      field.isRequiredForProductEntry ||
      applicableFieldsByName.get(normalizeSearchTerm(field.name))?.isRequiredForProductEntry ||
      (isDresserOrWardrobeCategorySelected && isDresserOrWardrobeRequiredCharacteristic(field.name))
    );

  const isDependencyReferenceGroupActive = (field: TechnicalFieldDefinition): boolean => {
    const categoryField = applicableFieldsByName.get(normalizeSearchTerm(field.name));
    if (!categoryField) return false;
    return isFieldRequired(categoryField) || isFieldActive(field);
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
  const isFieldDependencySatisfied = createTechnicalFieldDependencyResolver({
    allTechnicalFields,
    formData,
    technicalValues,
    isMultiVariationProduct,
    variableTechnicalFieldNames,
    isDependencyReferenceGroupActive,
  });
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
        isRequired: isFieldRequiredForProductEntry(field),
        isRequiredForCatalog: isFieldRequiredForCatalog(field),
        isRequiredForProductEntry: isFieldRequiredForProductEntryLabel(field),
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
  const groupViews = buildProductCharacteristicGroupViews({
    characteristicGroups,
    sofaTechnicalFields,
    applicableFieldsByName,
    dependencyReferenceIds,
    formData,
    variableTechnicalFieldNames,
    isMultiVariationProduct,
    isCatalogRequiredForSelectedCategory,
    hasStoredField,
    isFieldRequired,
    isFieldRequiredForProductEntry,
    isFieldRequiredForCatalog,
    isFieldRequiredForProductEntryLabel,
    isFieldSelected,
    isFieldActive,
    isFieldDependencySatisfied,
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
  const { matchingProductGroups, matchingProductGroupFields } = buildMatchingProductGroupFields({
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
  });

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
