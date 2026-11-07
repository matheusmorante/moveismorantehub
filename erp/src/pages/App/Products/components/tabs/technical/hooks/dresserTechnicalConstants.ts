import type { TechnicalFieldDefinition } from '@/pages/utils/technicalValuesService';
import {
  DRESSER_OR_WARDROBE_REQUIRED_CHARACTERISTIC_NAMES,
  isDresserDoorQuantityCharacteristic,
  isDresserDrawerQuantityCharacteristic,
} from '../../../../../../../../../shared-utils/productTechnicalFieldScope';

export const getDresserOrWardrobeRequiredTechnicalFields = (
  allFields: readonly TechnicalFieldDefinition[],
  categoryIds: readonly string[] = []
): TechnicalFieldDefinition[] =>
  DRESSER_OR_WARDROBE_REQUIRED_CHARACTERISTIC_NAMES.map((name) => {
    const matches = isDresserDoorQuantityCharacteristic(name)
      ? isDresserDoorQuantityCharacteristic
      : isDresserDrawerQuantityCharacteristic;
    const existing = allFields.find((field) => matches(field.name));
    return {
      id: existing?.id || `dresser-required:${name.toLocaleLowerCase('pt-BR').replace(/\s+/g, '-')}`,
      ...existing,
      name: existing?.name || name,
      dataType: 'integer',
      options: existing?.options || [],
      isRequired: true,
      isRequiredForProductEntry: true,
      active: true,
      categoryApplications: undefined,
      categoryIds: existing?.categoryIds || [...categoryIds],
    };
  });
