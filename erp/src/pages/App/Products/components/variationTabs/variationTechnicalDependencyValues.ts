import {
  isTechnicalFieldVariable,
  type TechnicalFieldDefinition,
} from '@/pages/utils/technicalValuesService';
import {
  isDoorQuantityCharacteristic,
  isDrawerQuantityCharacteristic,
  isHasDoorsCharacteristic,
  isHasDrawersCharacteristic,
} from '@/pages/utils/technicalValues/predicates/furniture';

interface BuildVariationTechnicalDependencyValuesParams {
  readonly allTechnicalFields: TechnicalFieldDefinition[];
  readonly combinedValues: Record<string, any>;
  readonly formDataTechnicalValues?: Record<string, any>;
  readonly variableFieldNames: string[];
  readonly variationAttributeValues: Record<string, any>;
}

export function buildVariationTechnicalDependencyValues({
  allTechnicalFields,
  combinedValues,
  formDataTechnicalValues,
  variableFieldNames,
  variationAttributeValues,
}: BuildVariationTechnicalDependencyValuesParams): Record<string, any> {
  const values = { ...combinedValues };

  const useVariationQuantity = (
    isQuantity: (name: string) => boolean,
    isLegacyToggle: (name: string) => boolean
  ) => {
    const quantityName = allTechnicalFields.find(
      (field) => isQuantity(field.name) && isTechnicalFieldVariable(field.name, variableFieldNames)
    )?.name;
    if (!quantityName) return;

    const ownQuantity =
      Object.entries(formDataTechnicalValues || {}).find(([name]) => isQuantity(name)) ||
      Object.entries(variationAttributeValues).find(([name]) => isQuantity(name));
    Object.keys(values).forEach((name) => {
      if (isQuantity(name) || isLegacyToggle(name)) delete values[name];
    });
    if (ownQuantity) values[quantityName] = ownQuantity[1];
  };

  useVariationQuantity(isDoorQuantityCharacteristic, isHasDoorsCharacteristic);
  useVariationQuantity(isDrawerQuantityCharacteristic, isHasDrawersCharacteristic);
  return values;
}
