import {
  getEffectiveProductTechnicalValues,
  getEffectiveVariationTechnicalValues,
  isMobileVariableTechnicalField,
  resolveMobileVariableTechnicalFieldNames,
} from '../mobile/src/features/products/domain/productCharacteristicValues';
import {
  parseDoorQuantityValue,
  parseDrawerQuantityValue,
} from '../erp/src/pages/utils/technicalValues/predicates/furniture';
import {
  DRESSER_OR_WARDROBE_REQUIRED_CHARACTERISTIC_NAMES,
  isDresserOrWardrobeCategoryName,
  isDresserDoorQuantityCharacteristic,
  isDresserDrawerQuantityCharacteristic,
} from './productTechnicalFieldScope';

const hasValidRequiredQuantity = (
  characteristicName: string,
  values: Readonly<Record<string, unknown>>
): boolean => {
  if (isDresserDoorQuantityCharacteristic(characteristicName)) {
    return parseDoorQuantityValue(values as Record<string, any>) !== null;
  }
  if (isDresserDrawerQuantityCharacteristic(characteristicName)) {
    return parseDrawerQuantityValue(values as Record<string, any>) !== null;
  }
  return true;
};

export const getMissingDresserOrWardrobeRequiredCharacteristics = (
  values: Readonly<Record<string, unknown>> = {}
): string[] =>
  DRESSER_OR_WARDROBE_REQUIRED_CHARACTERISTIC_NAMES.filter(
    (name) => !hasValidRequiredQuantity(name, values)
  );

export type DresserCharacteristicRequirementIssue = {
  path: Array<string | number>;
  message: string;
};

const getProductCategoryNames = (product: Record<string, any>): string => {
  const category = product.categoryName ?? product.category;
  const categoryNames = Array.isArray(product.categoryNames) ? product.categoryNames : [];
  return [
    ...categoryNames,
    typeof category === 'string' ? category : category?.name,
  ]
    .filter((name): name is string => typeof name === 'string' && Boolean(name.trim()))
    .join(' / ');
};

/** Cômodas e guarda-roupas exigem números inteiros para portas e gavetas. */
export const getDresserOrWardrobeCharacteristicRequirementIssues = (
  product: Record<string, any>
): DresserCharacteristicRequirementIssue[] => {
  if (!isDresserOrWardrobeCategoryName(getProductCategoryNames(product))) return [];

  const parentValues = getEffectiveProductTechnicalValues(product);
  const variations = Array.isArray(product.variations) ? product.variations : [];
  const variableFieldNames = resolveMobileVariableTechnicalFieldNames(product);
  const issues: DresserCharacteristicRequirementIssue[] = [];
  const missingParentValues = new Set(getMissingDresserOrWardrobeRequiredCharacteristics(parentValues));

  DRESSER_OR_WARDROBE_REQUIRED_CHARACTERISTIC_NAMES.forEach((name) => {
    if (variations.length > 0 && isMobileVariableTechnicalField(name, variableFieldNames)) {
      variations.forEach((variation: Record<string, any>, index: number) => {
        const values = getEffectiveVariationTechnicalValues({}, variation, variableFieldNames);
        if (!getMissingDresserOrWardrobeRequiredCharacteristics(values).includes(name)) return;
        issues.push({
          path: ['variations', index, 'technicalValues', name],
          message: `Informe um número inteiro para “${name}” em cada variação de cômodas ou guarda-roupas.`,
        });
      });
      return;
    }

    if (!missingParentValues.has(name)) return;
    issues.push({
      path: ['technicalValues', name],
      message: `Informe um número inteiro para “${name}” em produtos da categoria Cômodas ou Guarda-Roupas.`,
    });
  });

  return issues;
};
