import type Product from '@/pages/types/product.type';
import {
  TechnicalFieldDefinition,
  getApplicableTechnicalFields,
  groupTechnicalFields,
  mergeCharacteristicGroups,
  isYesNoValueActive,
} from '@/pages/utils/technicalValuesService';
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
  const isSofaCategorySelected = /(?:^|[^a-z0-9])sofas?(?=$|[^a-z0-9])/i.test(
    normalizeSearchTerm(categoryName)
  );

  const categoryTechnicalFields = allTechnicalFields.filter(
    (field) =>
      isSofaCategorySelected || !SOFA_ONLY_DIMENSION_NAMES.has(normalizeSearchTerm(field.name))
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
    const normalizedName = normalizeSearchTerm(field.name);
    if (!isSofaCategorySelected) return field;
    if (normalizedName === 'profundidade' || normalizedName === 'profundidade total') {
      return { ...field, isRequired: false };
    }
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
  const requiredFieldGroups = groupTechnicalFields(requiredFields);
  const optionalFields = visibleFields.filter((field) => !field.isRequired);

  const normalizedSearchTerm = normalizeSearchTerm(characteristicSearchTerm);
  const normalizedDebouncedSearchTerm = normalizeSearchTerm(debouncedCharacteristicSearchTerm);

  const filledOrManualOptionalFields = optionalFields.filter((field) =>
    isOptionalFieldSelected(field, formData, manualFieldNames)
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
    requiredFields,
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
