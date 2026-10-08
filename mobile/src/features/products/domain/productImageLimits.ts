export const MAX_VARIATION_IMAGES = 15;

/** O produto pai mantém ao menos 15 fotos e ganha mais 15 por variação adicional. */
export const getMaxParentProductImages = (variationCount = 0): number =>
  Math.max(1, variationCount) * MAX_VARIATION_IMAGES;
