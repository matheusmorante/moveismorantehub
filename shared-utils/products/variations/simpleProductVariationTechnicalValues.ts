export interface SimpleProductVariationTechnicalValuesInput {
  readonly hasVariations: boolean;
  readonly variationCount: number;
  readonly parentTechnicalValues?: Record<string, unknown> | null;
  readonly currentVariationTechnicalValues?: Record<string, unknown>;
}

/**
 * A variação única de um produto simples herda os valores técnicos do pai.
 */
export const getSimpleProductVariationTechnicalValues = ({
  hasVariations,
  variationCount,
  parentTechnicalValues,
  currentVariationTechnicalValues,
}: SimpleProductVariationTechnicalValuesInput): Record<string, unknown> | undefined => {
  if (hasVariations || variationCount !== 1) {
    return currentVariationTechnicalValues;
  }

  return parentTechnicalValues == null
    ? currentVariationTechnicalValues
    : { ...parentTechnicalValues };
};
