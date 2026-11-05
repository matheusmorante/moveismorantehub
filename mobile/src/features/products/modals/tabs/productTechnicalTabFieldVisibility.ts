import {
  getApplicableProductTechnicalFields,
  isExcludedProductTechnicalField,
  isProductTechnicalFieldApplicableByCategory,
  isProductTechnicalFieldRequired,
} from '../../domain/productCharacteristics';
import type { MobileProductTechnicalField } from '../../services/mobileProductTechnicalService';

interface ResolveVisibleProductTechnicalFieldsArgs {
  technicalFields: MobileProductTechnicalField[];
  categoryIds: string[];
  parentTechnicalValues: Record<string, unknown>;
  ownTechnicalValues: Record<string, unknown>;
  manualFieldNames: string[];
  selectedCategoryName: string;
  requiredFieldsOnly: boolean;
  parentData?: any;
  isVariableField: (fieldName: string) => boolean;
}

export const normalizeName = (name: string) => name.trim().toLocaleLowerCase('pt-BR');

export const normalizeSearchTerm = (value: string) =>
  value
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pt-BR');

export const resolveVisibleProductTechnicalFields = ({
  technicalFields,
  categoryIds,
  parentTechnicalValues,
  ownTechnicalValues,
  manualFieldNames,
  selectedCategoryName,
  requiredFieldsOnly,
  parentData,
  isVariableField,
}: ResolveVisibleProductTechnicalFieldsArgs) => {
  const values = { ...parentTechnicalValues, ...ownTechnicalValues };
  const visible = getApplicableProductTechnicalFields(
    technicalFields,
    categoryIds,
    values,
    manualFieldNames,
    selectedCategoryName
  );
  const existingNames = new Set(visible.map((field) => normalizeName(field.name)));
  const preservedLegacyFields = Object.keys(values)
    .filter(
      (name) =>
        !isExcludedProductTechnicalField(name) &&
        isProductTechnicalFieldApplicableByCategory({ name }, categoryIds, selectedCategoryName) &&
        !existingNames.has(normalizeName(name))
    )
    .map((name) => ({
      id: `legacy:${name}`,
      name,
      data_type: 'text',
      unit: '',
      options: [],
      isRequired: isProductTechnicalFieldRequired(
        { name },
        categoryIds,
        selectedCategoryName
      ),
    }));
  const allVisibleFields = [...visible, ...preservedLegacyFields];
  if (parentData) {
    const fieldsByName = new Map<string, any>();
    [...allVisibleFields, ...technicalFields].forEach((field) => {
      if (
        !isProductTechnicalFieldApplicableByCategory(
          field,
          categoryIds,
          selectedCategoryName
        )
      ) return;
      if (!isVariableField(field.name)) return;
      const key = normalizeSearchTerm(field.name);
      if (!fieldsByName.has(key)) fieldsByName.set(key, field);
    });
    return [...fieldsByName.values()];
  }
  return requiredFieldsOnly
    ? allVisibleFields.filter((field) =>
        isProductTechnicalFieldRequired(field, categoryIds, selectedCategoryName)
      )
    : allVisibleFields;
};
