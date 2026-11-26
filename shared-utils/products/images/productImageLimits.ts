/** Limites compartilhados da galeria de produtos e de suas variações. */
export const MAX_PARENT_PRODUCT_IMAGES = 75;
export const MAX_VARIATION_IMAGES = 15;

/** A galeria do produto pai mantém o mesmo limite independentemente do número de variações. */
export const getMaxParentProductImages = (_variationCount = 0): number => MAX_PARENT_PRODUCT_IMAGES;
