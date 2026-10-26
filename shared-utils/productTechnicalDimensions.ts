export type ProductTechnicalDimensionField = 'width' | 'height' | 'depth' | 'weight';

/** Resolve apenas as características que têm uma coluna física equivalente no Produto. */
export const getProductTechnicalDimensionField = (
  fieldName: string
): ProductTechnicalDimensionField | null => {
  const normalizedName = String(fieldName || '').trim().toLocaleLowerCase('pt-BR');

  if (normalizedName === 'altura' || normalizedName === 'altura total') return 'height';
  if (normalizedName === 'largura' || normalizedName === 'largura total') return 'width';
  if (
    normalizedName === 'profundidade' ||
    normalizedName === 'profundidade total' ||
    normalizedName === 'comprimento' ||
    normalizedName === 'comprimento total'
  ) {
    return 'depth';
  }
  if (normalizedName === 'peso') return 'weight';

  return null;
};

/** Mantém o contrato do ERP para colunas dimensionais: somente números positivos são persistidos. */
export const parseProductTechnicalDimension = (value: unknown): number | undefined => {
  if (typeof value === 'number') return Number.isFinite(value) && value > 0 ? value : undefined;
  if (typeof value !== 'string' || !value.trim()) return undefined;

  const parsed = Number(value.replace(',', '.'));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
};
