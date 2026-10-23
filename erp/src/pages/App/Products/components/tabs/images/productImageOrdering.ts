export { replaceProductImageGlobally } from '../../../../../../../../shared-utils/productImageOperations';
export {
  moveProductImage,
  moveProductImageGlobally,
  setProductCoverImage,
  setProductSecondaryImage,
} from '../../../../../../../../shared-utils/productImageOrdering';

export function replaceProductImage(
  images: string[],
  imageIndex: number,
  imageUrl: string
): string[] {
  if (imageIndex < 0 || imageIndex >= images.length) return images;

  const updatedImages = [...images];
  updatedImages[imageIndex] = imageUrl;
  return updatedImages;
}

export function replaceImageUrlAcrossList(
  images: readonly string[] | undefined,
  oldUrl: string,
  newUrl: string
): string[] {
  if (!images || images.length === 0) return [];
  if (!oldUrl) return [...images];
  return images.map((url) => (url === oldUrl ? newUrl : url));
}
