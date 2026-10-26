import { MAX_VARIATION_IMAGES } from '../../../../../shared-utils/productImageLimits';
import { parseVariationImages } from '../../../../../shared-utils/productVariationImages';

/** Preserves the product gallery for a simple variation and caps family-specific galleries. */
export const resolveMobileVariationImages = (
  rawImageUrl: unknown,
  rawImages: unknown,
  hasVariationFamily: boolean
): string[] => {
  const images = parseVariationImages(rawImageUrl, rawImages);
  return hasVariationFamily ? images.slice(0, MAX_VARIATION_IMAGES) : images;
};
