import type Product from '@/pages/types/product.type';

const sortFormSnapshotKeys = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(sortFormSnapshotKeys);
  if (!value || typeof value !== 'object') return value;

  return Object.fromEntries(
    Object.entries(value).sort(([left], [right]) => left.localeCompare(right)).map(
      ([key, nestedValue]) => [key, sortFormSnapshotKeys(nestedValue)]
    )
  );
};

export const serializeProductFormForDirtyCheck = (data: Partial<Product>) => {
  const trackedData = { ...data };
  delete trackedData.availableEnvironments;
  // This value is recomputed from cost, IPI, and freight by the form sync hook.
  delete trackedData.finalPurchasePrice;
  if (data.id) {
    // Existing stock balances are managed by inventory workflows, not this form.
    delete trackedData.stock;
  }
  if (data.hasVariations && data.variations?.length) {
    // ProductGeneralTab derives this legacy summary from the actual variation colors.
    const variationColors = Array.from(new Set(
      data.variations.flatMap((variation) =>
        (variation.attributes || [])
          .filter((attribute) => attribute.name?.trim().toLocaleUpperCase('pt-BR') === 'COR' && typeof attribute.value === 'string' && attribute.value.trim())
          .map((attribute) => (attribute.value as string).trim().toLocaleUpperCase('pt-BR'))
      )
    ));
    if (variationColors.length) trackedData.colors = variationColors.join(' / ');
  }
  trackedData.variations = data.variations?.map((variation) => {
    const trackedVariation = { ...variation };
    if (data.id) delete trackedVariation.stock;
    if (variation.syncUnitPrice) trackedVariation.unitPrice = 0;
    if (variation.syncCostPrice) trackedVariation.costPrice = 0;
    if (variation.syncPromoPrice !== false) trackedVariation.promoPrice = 0;
    if (variation.syncDescription) trackedVariation.description = '';
    if (variation.syncWidth) trackedVariation.width = 0;
    if (variation.syncHeight) trackedVariation.height = 0;
    if (variation.syncDepth) trackedVariation.depth = 0;
    if (variation.syncWeight) trackedVariation.weight = 0;
    if (variation.syncCondition) trackedVariation.condition = '';
    if (variation.syncFiscal) {
      if (variation.syncNcm === false) {
        trackedVariation.fiscal = variation.fiscal
          ? { ncm: variation.fiscal.ncm }
          : undefined;
      } else {
        trackedVariation.fiscal = undefined;
      }
    }
    return trackedVariation;
  });
  return JSON.stringify(sortFormSnapshotKeys(trackedData));
};
