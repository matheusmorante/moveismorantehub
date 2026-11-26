/** Characteristics no longer clear other values when a field changes. */
export const cleanupDependentCharacteristicsOnZero = (
  technicalValues: Record<string, unknown>,
  _fieldName: string,
  _value: unknown
): Record<string, unknown> => technicalValues;

/** Variation attributes remain intact when quantity characteristics change. */
export const cleanupDependentVariationAttributesOnQuantityChange = <
  T extends { readonly name?: string | null },
>(attributes: readonly T[]): T[] => [...attributes];
