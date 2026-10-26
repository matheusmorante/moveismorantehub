import { parseVariationImages } from './productVariationImages';

export interface ProductWithImageReferences {
  images?: string[];
  variations?: Array<{ images?: string[]; image_url?: string | null }>;
}

/** Removes a parent gallery photo and its variation links, matching the ERP form behavior. */
export const removeProductImageGlobally = <T extends ProductWithImageReferences>(
  product: T,
  imageUrl: string
): T => {
  const updatedImages = product.images?.filter((image) => image !== imageUrl);
  const updatedVariations = product.variations?.map((variation) => {
    const variationImages = parseVariationImages(variation.image_url, variation.images);
    const hasImage = variationImages.includes(imageUrl);
    if (product.variations?.length === 1) {
      const inheritedImages = updatedImages || [];
      return {
        ...variation,
        images: inheritedImages,
        ...(variation.image_url !== undefined
          ? { image_url: inheritedImages.length > 0 ? inheritedImages.join(',') : null }
          : {}),
      };
    }
    if (!hasImage) return variation;

    const remainingImages = variationImages.filter((image) => image !== imageUrl);
    return {
      ...variation,
      images: remainingImages,
      ...(variation.image_url !== undefined
        ? { image_url: remainingImages.length > 0 ? remainingImages.join(',') : null }
        : {}),
    };
  });

  return {
    ...product,
    images: updatedImages,
    ...(updatedVariations ? { variations: updatedVariations } : {}),
  } as T;
};

/** Replaces a parent gallery photo and all variation references, matching ERP and mobile behavior. */
export const replaceProductImageGlobally = <T extends ProductWithImageReferences>(
  product: T,
  oldUrl: string,
  newUrl: string,
  fallbackIndex?: number
): T => {
  const currentImages = Array.isArray(product.images) ? product.images : [];
  let updatedImages = [...currentImages];

  if (oldUrl && currentImages.includes(oldUrl)) {
    updatedImages = currentImages.map((image) => (image === oldUrl ? newUrl : image));
  } else if (
    fallbackIndex !== undefined &&
    fallbackIndex >= 0 &&
    fallbackIndex < currentImages.length
  ) {
    updatedImages[fallbackIndex] = newUrl;
  }

  const updatedVariations = product.variations?.map((variation) => {
    if (product.variations?.length === 1) {
      return { ...variation, images: [...updatedImages] };
    }

    const hasOldInImages = Boolean(oldUrl && variation.images?.includes(oldUrl));
    const hasOldInImageUrl = Boolean(oldUrl && variation.image_url === oldUrl);
    if (!hasOldInImages && !hasOldInImageUrl) return variation;

    return {
      ...variation,
      ...(hasOldInImages && variation.images
        ? { images: variation.images.map((image) => (image === oldUrl ? newUrl : image)) }
        : {}),
      ...(hasOldInImageUrl ? { image_url: newUrl } : {}),
    };
  });

  return {
    ...product,
    images: updatedImages,
    ...(updatedVariations !== undefined ? { variations: updatedVariations } : {}),
  } as T;
};
