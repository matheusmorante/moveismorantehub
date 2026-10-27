import type VariationType from '../erp/src/pages/types/variation.type';

/** Converte tipos legados de característica para o tipo canônico usado no ERP. */
export const normalizeAttributeDataType = (
  value?: VariationType['dataType']
): NonNullable<VariationType['dataType']> => {
  if (value === 'text') return 'text_short';
  if (value === 'number') return 'integer';
  if (value === 'list') return 'radio';
  return value || 'text_short';
};

/** Mantém compatibilidade com definições legadas sem tipo explícito. */
export const inferAttributeDataType = (
  name: string,
  value?: VariationType['dataType']
): NonNullable<VariationType['dataType']> => {
  if (value) return normalizeAttributeDataType(value);

  const normalizedName = name.trim().toLocaleLowerCase('pt-BR');
  if (['altura', 'largura', 'peso', 'profundidade'].includes(normalizedName)) return 'measure';
  if (
    [
      'densidade da espuma',
      'tecido',
      'espelho',
      'contém espelho',
      'tipo de porta',
      'tipo de portas',
      'sistema de deslizamento da gaveta',
      'tipo de pés',
      'material de pés',
      'material dos pés',
      'material dos puxadores',
      'acabamento',
      'cor',
      'estrutura',
      'material da estrutura',
    ].includes(normalizedName)
  ) return 'radio';
  if (['tipo de puxador', 'tipo(s) de puxador'].includes(normalizedName)) return 'multi_select';
  if (
    [
      'quantidade de gavetas',
      'quantidade de gaveta',
      'quantidade de portas',
      'quantidade de porta',
    ].includes(normalizedName)
  ) return 'integer';

  return normalizeAttributeDataType(value);
};
