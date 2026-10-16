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

export function setProductCoverImage(images: string[], imageIndex: number): string[] {
  if (imageIndex <= 0 || imageIndex >= images.length) return images;

  const orderedImages = [...images];
  const [coverImage] = orderedImages.splice(imageIndex, 1);
  return [coverImage, ...orderedImages];
}

export function setProductSecondaryImage(images: string[], imageIndex: number): string[] {
  if (imageIndex <= 1 || imageIndex >= images.length) return images;
  return moveProductImage(images, imageIndex, 1);
}

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

export function replaceProductImageGlobally<
  T extends { images?: string[]; variations?: Array<{ images?: string[]; [key: string]: any }> }
>(product: T, oldUrl: string, newUrl: string, fallbackIndex?: number): T {
  let updatedImages: string[];
  const currentImages = product.images || [];

  if (oldUrl && currentImages.includes(oldUrl)) {
    updatedImages = currentImages.map((img) => (img === oldUrl ? newUrl : img));
  } else if (
    fallbackIndex !== undefined &&
    fallbackIndex >= 0 &&
    fallbackIndex < currentImages.length
  ) {
    updatedImages = replaceProductImage(currentImages, fallbackIndex, newUrl);
  } else {
    updatedImages = [...currentImages];
  }

  const updatedVariations = product.variations?.map((v) => {
    const hasOldInImages = Boolean(v.images && oldUrl && v.images.includes(oldUrl));
    const hasOldInImageUrl = Boolean(oldUrl && (v as any).image_url === oldUrl);

    if (!hasOldInImages && !hasOldInImageUrl) {
      return v;
    }

    const nextV = { ...v };
    if (hasOldInImages && v.images) {
      nextV.images = v.images.map((img) => (img === oldUrl ? newUrl : img));
    }
    if (hasOldInImageUrl) {
      (nextV as any).image_url = newUrl;
    }
    return nextV;
  });

  return {
    ...product,
    images: updatedImages,
    ...(updatedVariations !== undefined ? { variations: updatedVariations } : {}),
  };
}
