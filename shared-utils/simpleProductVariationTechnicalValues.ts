export interface SimpleProductVariationTechnicalValuesInput {
  readonly isExistingProduct: boolean;
  readonly hasVariations: boolean;
  readonly variationCount: number;
  readonly parentTechnicalValues?: Record<string, unknown> | null;
  readonly currentVariationTechnicalValues?: Record<string, unknown>;
}

/**
 * A variação única de um produto novo herda os valores técnicos do pai.
 * Produtos salvos e famílias mantêm os valores próprios da variação.
 */
export const getSimpleProductVariationTechnicalValues = ({
  isExistingProduct,
  hasVariations,
  variationCount,
  parentTechnicalValues,
  currentVariationTechnicalValues,
}: SimpleProductVariationTechnicalValuesInput): Record<string, unknown> | undefined => {
  if (isExistingProduct || hasVariations || variationCount !== 1) {
    return currentVariationTechnicalValues;
  }

  return parentTechnicalValues == null ? undefined : { ...parentTechnicalValues };
};
