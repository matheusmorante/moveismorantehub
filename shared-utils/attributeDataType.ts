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
