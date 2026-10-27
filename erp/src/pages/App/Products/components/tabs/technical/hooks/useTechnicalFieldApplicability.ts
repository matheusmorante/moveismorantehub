import type Product from '@/pages/types/product.type';
import {
  TechnicalFieldDefinition,
  getApplicableTechnicalFields,
  groupTechnicalFields,
  mergeCharacteristicGroups,
  isYesNoValueActive,
  isChairWeightCapacityCharacteristic,
  isDoorQuantityCharacteristic,
  isDrawerQuantityCharacteristic,
  getCharacteristicDependencyState,
  isTechnicalFieldVariable,
  resolveVariableTechnicalFieldNames,
} from '@/pages/utils/technicalValuesService';
import { isDependentCharacteristicVisible } from '../../../../../../../../../shared-utils/productCharacteristicDependencies';
import {
  isSofaCategoryName,
  isWardrobeCategoryName,
} from '../../../../../../../../../shared-utils/productTechnicalFieldRules';
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

export interface UseTechnicalFieldApplicabilityParams {
  readonly allTechnicalFields: readonly TechnicalFieldDefinition[];
  readonly formData: Partial<Product>;
  readonly categoryName?: string;
  readonly manualFieldNames: readonly string[];
  readonly requiredFieldsOnly?: boolean;
  readonly characteristicSearchTerm: string;
  readonly debouncedCharacteristicSearchTerm: string;
}

export const useTechnicalFieldApplicability = ({
  allTechnicalFields,
  formData,
  categoryName = '',
  manualFieldNames,
  requiredFieldsOnly = false,
  characteristicSearchTerm,
  debouncedCharacteristicSearchTerm,
}: UseTechnicalFieldApplicabilityParams) => {
  const isSofaCategorySelected = isSofaCategoryName(categoryName);
  const isWardrobeCategorySelected = isWardrobeCategoryName(categoryName);
  const isChairCategorySelected = /(?:^|[^a-z0-9])cadeiras?(?=$|[^a-z0-9])/i.test(
    normalizeSearchTerm(categoryName)
  );
  const selectedCategoryIds = new Set(formData.categoryIds || []);

  const categoryTechnicalFields = allTechnicalFields.filter(
    (field) => {
      if (isChairWeightCapacityCharacteristic(field.name)) {
        const isLinkedToSelectedCategory = field.categoryIds?.some((id) =>
          selectedCategoryIds.has(id)
        );
        if (!isChairCategorySelected && !isLinkedToSelectedCategory) return false;
      }

      return (
        isSofaCategorySelected ||
        !SOFA_ONLY_DIMENSION_NAMES.has(normalizeSearchTerm(field.name))
      );
    }
  );

  const sofaTechnicalFields = isSofaCategorySelected
    ? [
        ...categoryTechnicalFields,
        ...SOFA_ONLY_DIMENSION_DEFAULTS.filter(
          (defaultField) =>
            !categoryTechnicalFields.some(
              (field) => normalizeSearchTerm(field.name) === normalizeSearchTerm(defaultField.name)
            )
        ),
      ]
    : categoryTechnicalFields;

  const retractableField =
    sofaTechnicalFields.find(
      (field) => isRetractableCharacteristic(field.name) && field.active !== false
    ) || SOFA_RETRACTABLE_FIELD;

  const retractableValue = Object.entries(formData.technicalValues || {}).find(([name]) =>
    isRetractableCharacteristic(name)
  )?.[1];
  const isSofaRetractableActive =
    isSofaCategorySelected && isYesNoValueActive(retractableValue);

  const applicableFieldsForCategory = getApplicableTechnicalFields(
    sofaTechnicalFields,
    formData.categoryIds || [],
    formData.technicalValues || {},
    manualFieldNames
  );

  const applicableFieldsByName = new Map<string, TechnicalFieldDefinition>(
    applicableFieldsForCategory.map(
      (field): [string, TechnicalFieldDefinition] => [normalizeSearchTerm(field.name), field]
    )
  );

  if (isWardrobeCategorySelected) {
    sofaTechnicalFields
      .filter(
        (field) =>
          isDoorQuantityCharacteristic(field.name) ||
          isDrawerQuantityCharacteristic(field.name)
      )
      .forEach((field) => {
        const key = normalizeSearchTerm(field.name);
        applicableFieldsByName.set(key, {
          ...field,
          ...applicableFieldsByName.get(key),
          isRequired: true,
        });
      });
  }

  if (isSofaCategorySelected) {
    applicableFieldsByName.set(normalizeSearchTerm(retractableField.name), {
      ...retractableField,
      isRequired: true,
    });

    if (isSofaRetractableActive) {
      SOFA_ONLY_DIMENSION_DEFAULTS.filter((field) =>
        isOpenClosedSofaDepth(field.name)
      ).forEach((defaultField) => {
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
    if (!isSofaCategorySelected) return field;
    if (isOpenClosedSofaDepth(field.name)) {
      return { ...field, isRequired: isSofaRetractableActive };
    }
    if (isRetractableCharacteristic(field.name)) return { ...field, isRequired: true };
    return field;
  });

  const visibleFields = requiredFieldsOnly
    ? applicableFields.filter((field) => field.isRequired)
    : applicableFields;

  const requiredFields = visibleFields.filter((field) => field.isRequired);
  const catalogRequiredFields = visibleFields.filter(
    (field) => field.isRequiredForCatalog && !field.isRequired
  );
  const requiredFieldGroups = groupTechnicalFields([
    ...requiredFields,
    ...catalogRequiredFields,
  ]);
  const optionalFields = visibleFields.filter(
    (field) => !field.isRequired && !field.isRequiredForCatalog
  );

  const normalizedSearchTerm = normalizeSearchTerm(characteristicSearchTerm);
  const normalizedDebouncedSearchTerm = normalizeSearchTerm(debouncedCharacteristicSearchTerm);

  const variableTechnicalFieldNames = resolveVariableTechnicalFieldNames(
    formData.variableTechnicalFields,
    formData.variations || []
  );
  const isMultiVariationProduct =
    Boolean(formData.hasVariations) || (formData.variations || []).length > 1;
  const technicalValues = formData.technicalValues || {};
  const hasExplicitValue = (field: TechnicalFieldDefinition) => {
    const entry = Object.entries(technicalValues).find(
      ([name]) => normalizeSearchTerm(name) === normalizeSearchTerm(field.name)
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
            normalizeSearchTerm(candidate.name) ===
            normalizeSearchTerm(dependency.masterFieldLabel!)
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

  const filledOrManualOptionalFields = optionalFields.filter(
    (field) =>
      manualFieldNames.includes(field.name) || isOptionalFieldActive(field)
  );

  const displayedOptionalFields = getDisplayedOptionalFields({
    requiredFieldsOnly,
    optionalFields,
    allTechnicalFields,
    filledOrManualOptionalFields,
    normalizedSearchTerm,
  });

  const matchingOptionalFields = getMatchingOptionalFields(
    sofaTechnicalFields,
    [...requiredFields, ...catalogRequiredFields],
    displayedOptionalFields,
    requiredFieldsOnly,
    normalizedSearchTerm,
    normalizedDebouncedSearchTerm
  );

  const matchingGroups = getMatchingTopicGroups(
    requiredFieldsOnly,
    normalizedSearchTerm,
    normalizedDebouncedSearchTerm
  );

  const fieldGroups = requiredFieldsOnly
    ? requiredFieldGroups
    : mergeCharacteristicGroups([
        ...requiredFieldGroups,
        ...groupTechnicalFields(displayedOptionalFields),
      ]);

  return {
    isSofaCategorySelected,
    sofaTechnicalFields,
    visibleFields,
    requiredFields,
    requiredFieldGroups,
    optionalFields,
    displayedOptionalFields,
    matchingOptionalFields,
    matchingGroups,
    fieldGroups,
    normalizedSearchTerm,
    normalizedDebouncedSearchTerm,
  };
};
