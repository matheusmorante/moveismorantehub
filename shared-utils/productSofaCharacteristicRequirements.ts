import { findProductTechnicalValueEntry } from './productTechnicalValueAliases';
import {
  isSofaCategoryName,
  SOFA_REQUIRED_CHARACTERISTIC_NAMES,
} from './productTechnicalFieldScope';
import {
  getEffectiveProductTechnicalValues,
  getEffectiveVariationTechnicalValues,
  isMobileVariableTechnicalField,
  resolveMobileVariableTechnicalFieldNames,
} from '../mobile/src/features/products/domain/productCharacteristics';

const normalizeAnswer = (value: unknown): string =>
  String(value ?? '')
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pt-BR');

/** Boolean sofa characteristics require an explicit Sim/Não answer; false is a valid answer. */
export const isAnsweredSofaBooleanCharacteristic = (value: unknown): boolean => {
  if (typeof value === 'boolean') return true;
  if (typeof value === 'number') return value === 0 || value === 1;
  return ['sim', 'nao', 'true', 'false', '1', '0'].includes(normalizeAnswer(value));
};

export const getMissingSofaRequiredCharacteristics = (
  values: Readonly<Record<string, unknown>> = {}
): string[] =>
  SOFA_REQUIRED_CHARACTERISTIC_NAMES.filter((name) =>
    !isAnsweredSofaBooleanCharacteristic(findProductTechnicalValueEntry(values, name)?.value)
  );

export type SofaCharacteristicRequirementIssue = {
  path: Array<string | number>;
  message: string;
};

const getProductCategoryName = (product: Record<string, any>): string => {
  const category = product.categoryName ?? product.category;
  const categoryNames = Array.isArray(product.categoryNames)
    ? product.categoryNames
    : [];
  const names = [
    ...categoryNames,
    typeof category === 'string' ? category : category?.name,
  ].filter((name): name is string => typeof name === 'string' && Boolean(name.trim()));
  return names.join(' / ');
};

/** Final product forms must collect each sofa answer on its owner (parent or variable variation). */
export const getSofaCharacteristicRequirementIssues = (
  product: Record<string, any>
): SofaCharacteristicRequirementIssue[] => {
  if (!isSofaCategoryName(getProductCategoryName(product))) return [];

  const parentValues = getEffectiveProductTechnicalValues(product);
  const variations = Array.isArray(product.variations) ? product.variations : [];
  const variableFieldNames = resolveMobileVariableTechnicalFieldNames(product);
  const issues: SofaCharacteristicRequirementIssue[] = [];

  SOFA_REQUIRED_CHARACTERISTIC_NAMES.forEach((name) => {
    if (variations.length > 0 && isMobileVariableTechnicalField(name, variableFieldNames)) {
      variations.forEach((variation: Record<string, any>, index: number) => {
        const effectiveValues = getEffectiveVariationTechnicalValues(
          {},
          variation,
          variableFieldNames
        );
        if (!getMissingSofaRequiredCharacteristics(effectiveValues).includes(name)) return;
        issues.push({
          path: ['variations', index, 'technicalValues', name],
          message: `Informe Sim ou Não para “${name}” em cada variação de Sofás.`,
        });
      });
      return;
    }

    if (getMissingSofaRequiredCharacteristics(parentValues).includes(name)) {
      issues.push({
        path: ['technicalValues', name],
        message: `Informe Sim ou Não para “${name}” em produtos da categoria Sofás.`,
      });
    }
  });

  return issues;
};
