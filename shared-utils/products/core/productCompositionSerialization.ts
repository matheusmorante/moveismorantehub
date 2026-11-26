type CompositionItemRecord = Record<string, unknown>;

/** An unset component variation is represented by an absent key in ERP payloads. */
export const omitAbsentCompositionVariationId = (
  item: CompositionItemRecord,
): CompositionItemRecord => {
  if (item.variationId !== null && item.variationId !== undefined) return item;

  const withoutVariationId = { ...item };
  delete withoutVariationId.variationId;
  return withoutVariationId;
};

export const omitAbsentCompositionVariationIds = (items: unknown): unknown => {
  if (!Array.isArray(items)) return items;

  return items.map((item) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return item;
    return omitAbsentCompositionVariationId(item as CompositionItemRecord);
  });
};
