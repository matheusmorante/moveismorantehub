import {
  getTechnicalFieldTextPlaceholder as getSharedTechnicalFieldTextPlaceholder,
  isDimensionCharacteristicName,
  isTechnicalFieldMultiSelect,
  isWeightCapacityCharacteristic,
  isWeightCharacteristicName,
  PRODUCT_TECHNICAL_CHOICE_INLINE_OPTION_LIMIT,
  PRODUCT_TECHNICAL_CHOICE_SEARCH_DEBOUNCE_MS,
  PRODUCT_TECHNICAL_CHOICE_SEARCH_MIN_CHARACTERS,
} from '../../../../../shared-utils/productTechnicalFieldRules';

export const MAX_INLINE_CHOICE_OPTIONS = PRODUCT_TECHNICAL_CHOICE_INLINE_OPTION_LIMIT;
export const TECHNICAL_CHOICE_SEARCH_DEBOUNCE_MS = PRODUCT_TECHNICAL_CHOICE_SEARCH_DEBOUNCE_MS;
export const TECHNICAL_CHOICE_SEARCH_MIN_CHARACTERS = PRODUCT_TECHNICAL_CHOICE_SEARCH_MIN_CHARACTERS;

export type TechnicalFieldInputMode = 'inline' | 'searchable' | 'text';

export const resolveTechnicalFieldDataType = (name: string, dataType?: string | null) => {
  if (/^(linha|marca|modelo|modelo\s*\/\s*linha|linha\s*\/\s*modelo)$/i.test(name.trim())) {
    return 'text_short';
  }
  if (/quantidade\s+de\s+\S+/i.test(name) || /lugar(es)?/i.test(name)) {
    return 'integer';
  }
  if (isTechnicalFieldMultiSelect(name)) {
    return 'multi_select';
  }
  if (
    isWeightCharacteristicName(name) ||
    isWeightCapacityCharacteristic(name) ||
    dataType === 'weight'
  ) {
    return 'decimal';
  }
  if (dataType === 'measure' || isDimensionCharacteristicName(name)) {
    return 'measure';
  }
  return dataType || 'list';
};

export const getTechnicalFieldTextPlaceholder = getSharedTechnicalFieldTextPlaceholder;

export const getTechnicalFieldMaxLength = (dataType: string) => {
  if (dataType === 'text_long') return 4000;
  return dataType === 'text_short' || dataType === 'text' ? 120 : undefined;
};

export const getTechnicalFieldIntegerPlaceholder = (name: string) => {
  if (/lugar(es)?/i.test(name)) return 'Digite o número de quantidades';
  const quantitySubject = name.match(/quantidade\s+de\s+(.+)/i)?.[1]?.trim();
  if (quantitySubject) return `Insira a quantidade de ${quantitySubject}`;
  return 'Insira um número inteiro';
};

export const getTechnicalFieldInputMode = (
  dataType: string,
  optionCount: number
): TechnicalFieldInputMode => {
  if (
    (dataType === 'list' || dataType === 'radio') &&
    optionCount > 0 &&
    optionCount <= MAX_INLINE_CHOICE_OPTIONS
  ) {
    return 'inline';
  }

  if (dataType === 'radio' || dataType === 'multi_select' || dataType === 'list') {
    return 'searchable';
  }

  return 'text';
};
