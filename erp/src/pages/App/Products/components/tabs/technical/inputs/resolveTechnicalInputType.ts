import {
  isDimensionCharacteristicName,
  isWeightCharacteristicName,
  TechnicalFieldDefinition,
} from '@/pages/utils/technicalValuesService';
import { isTechnicalFieldMultiSelect } from '../../../../../../../../../shared-utils/productTechnicalFieldRules';

export function resolveTechnicalInputType(field: TechnicalFieldDefinition): string {
  let type = field.dataType || 'list';
  if (/^(marca|modelo|modelo\s*\/\s*linha|linha\s*\/\s*modelo|linha)$/i.test(field.name.trim())) {
    type = 'text_short';
  } else if (
    /quantidade\s+de\s+\S+/i.test(field.name) ||
    /lugar(es)?/i.test(field.name)
  ) {
    type = 'integer';
  } else if (isTechnicalFieldMultiSelect(field.name)) {
    type = 'multi_select';
  } else if (type === 'weight' || isWeightCharacteristicName(field.name)) {
    type = 'decimal';
  } else if (type === 'measure' || isDimensionCharacteristicName(field.name)) {
    type = 'measure';
  }
  return type;
}
