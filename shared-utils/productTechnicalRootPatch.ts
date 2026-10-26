export interface ProductTechnicalRootPatch {
  brand?: string;
}

export interface ProductTechnicalRootValueSource {
  weight?: unknown;
}

/** Retorna a propriedade raiz equivalente somente para características com mapeamento canônico. */
export const getProductTechnicalRootFallbackValue = (
  fieldName: string,
  product: ProductTechnicalRootValueSource
): unknown => {
  if (fieldName.trim().toLocaleLowerCase('pt-BR') !== 'peso') return undefined;
  return product.weight ? product.weight : undefined;
};

export const getProductTechnicalRootPatch = (
  fieldName: string,
  value: unknown
): ProductTechnicalRootPatch => {
  if (!/^marca$/i.test(fieldName.trim())) return {};

  return {
    brand: typeof value === 'string' ? value : String(value ?? ''),
  };
};
