export const MAX_PARENT_PRODUCT_IMAGES = 75;
export const MAX_VARIATION_IMAGES = 15;

/** Limite de fotos da galeria do produto pai (fixo em 75 fotos). */
export const getMaxParentProductImages = (_variationCount = 0): number => MAX_PARENT_PRODUCT_IMAGES;
