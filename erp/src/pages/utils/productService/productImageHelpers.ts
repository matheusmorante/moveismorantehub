import {
  getMaxParentProductImages,
  MAX_PARENT_PRODUCT_IMAGES,
  MAX_VARIATION_IMAGES,
} from '../productImageLimits';
import Product from '../../types/product.type';
export { parseVariationImages } from '../../../../../shared-utils/productVariationImages';

export { getMaxParentProductImages, MAX_PARENT_PRODUCT_IMAGES, MAX_VARIATION_IMAGES };

export const validateProductImageLimits = (
  product: Partial<Product>,
  existingProduct?: Partial<Product>
): void => {
  const images = product.images ?? existingProduct?.images ?? [];
  const variations = product.variations ?? existingProduct?.variations ?? [];
  const maxParentImages = MAX_PARENT_PRODUCT_IMAGES;
  const existingImageCount = existingProduct?.images?.length ?? 0;
  const singleVariationImages = variations.length === 1 ? variations[0].images || [] : [];
  const singleVariationUsesFullGallery =
    variations.length === 1 &&
    singleVariationImages.length === images.length &&
    images.every((image, index) => singleVariationImages[index] === image);

  if (images.length > maxParentImages && images.length > existingImageCount) {
    throw new Error(`O produto pai pode ter no máximo ${maxParentImages} fotos neste cadastro.`);
  }
  if (
    !singleVariationUsesFullGallery &&
    variations.some((variation) => (variation.images || []).length > MAX_VARIATION_IMAGES)
  ) {
    throw new Error(`Cada variação pode vincular no máximo ${MAX_VARIATION_IMAGES} fotos.`);
  }
};
