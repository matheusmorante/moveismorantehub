export const MAX_INLINE_CHOICE_OPTIONS = 8;

export type TechnicalFieldInputMode = 'inline' | 'searchable' | 'text';

export const resolveTechnicalFieldDataType = (name: string, dataType?: string | null) => {
  if (/^(linha|marca|modelo)$/i.test(name.trim())) return 'text_short';
  if (/quantidade de (portas?|gavetas?)/i.test(name) || /lugar(es)?/i.test(name)) {
    return 'integer';
  }
  return dataType || 'list';
};

export const getTechnicalFieldTextPlaceholder = (name: string) => {
  const normalizedName = name.trim().toLocaleLowerCase('pt-BR');
  if (normalizedName === 'marca') return 'Digite a marca';
  if (normalizedName === 'modelo') return 'Digite o modelo';
  if (normalizedName === 'linha') return 'Digite a linha';
  return undefined;
};

export const getTechnicalFieldMaxLength = (name: string, dataType: string) => {
  if (/^(linha|marca|modelo)$/i.test(name.trim())) return 30;
  return dataType === 'text_short' || dataType === 'text' ? 120 : undefined;
};

export const getTechnicalFieldIntegerLimit = (name: string) =>
  /lugar(es)?/i.test(name) ? 100 : 50;

export const getTechnicalFieldIntegerPlaceholder = (name: string) => {
  if (/lugar(es)?/i.test(name)) return 'Digite o número de quantidades';
  if (/porta|gaveta/i.test(name)) return 'Insira a quantidade de portas';
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

  if (
    dataType === 'radio' ||
    dataType === 'multi_select' ||
    dataType === 'list' ||
    dataType === 'boolean'
  ) {
    return 'searchable';
  }

  return 'text';
};
