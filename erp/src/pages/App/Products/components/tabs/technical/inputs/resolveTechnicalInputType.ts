import {
  isWeightCharacteristicName,
  TechnicalFieldDefinition,
} from '@/pages/utils/technicalValuesService';

export function resolveTechnicalInputType(field: TechnicalFieldDefinition): string {
  let type = field.dataType || 'list';
  if (/^(marca|modelo|modelo\s*\/\s*linha|linha\s*\/\s*modelo|linha)$/i.test(field.name.trim())) {
    type = 'text_short';
  } else if (
    /quantidade de (portas?|gavetas?|p[eé]s?)/i.test(field.name) ||
    /lugar(es)?/i.test(field.name)
  ) {
    type = 'integer';
  } else if (
    /corredi[çc]a/i.test(field.name) ||
    /tipo.*de.*porta/i.test(field.name) ||
    /tipo.*porta/i.test(field.name)
  ) {
    type = 'multi_select';
  } else if (type === 'weight' || isWeightCharacteristicName(field.name)) {
    type = 'decimal';
  }
  return type;
}
