import type { ProductWithImageReferences } from './productImageOperations';

export function moveProductImage(images: string[], fromIndex: number, toIndex: number): string[] {
  if (
    fromIndex === toIndex ||
    fromIndex < 0 ||
    toIndex < 0 ||
    fromIndex >= images.length ||
    toIndex >= images.length
  ) {
    return images;
  }

  const orderedImages = [...images];
  const [image] = orderedImages.splice(fromIndex, 1);
  orderedImages.splice(toIndex, 0, image);
  return orderedImages;
}

/** Reorders the parent gallery and keeps a single variation's inherited gallery aligned. */
export function moveProductImageGlobally<T extends ProductWithImageReferences>(
  product: T,
  fromIndex: number,
  toIndex: number
): T {
  const currentImages = Array.isArray(product.images) ? product.images : [];
  const images = moveProductImage(currentImages, fromIndex, toIndex);
  if (images === currentImages) return product;

  const variations = product.variations?.length === 1
    ? [{ ...product.variations[0], images: [...images] }]
    : product.variations;

  return {
    ...product,
    images,
    ...(variations !== undefined ? { variations } : {}),
  } as T;
}

export function setProductCoverImage(images: string[], imageIndex: number): string[] {
  if (imageIndex <= 0 || imageIndex >= images.length) return images;
  return moveProductImage(images, imageIndex, 0);
}

export function setProductSecondaryImage(images: string[], imageIndex: number): string[] {
  if (imageIndex <= 1 || imageIndex >= images.length) return images;
  return moveProductImage(images, imageIndex, 1);
}
