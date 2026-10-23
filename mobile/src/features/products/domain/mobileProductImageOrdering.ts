export interface MobileProductWithImages {
  images?: string[];
  variations?: Array<{ images?: string[]; image_url?: string; [key: string]: any }>;
  [key: string]: any;
}

export function replaceMobileProductImageGlobally<T extends MobileProductWithImages>(
  product: T,
  oldUrl: string,
  newUrl: string,
  fallbackIndex?: number
): T {
  const currentImages = Array.isArray(product.images) ? product.images : [];
  let images = [...currentImages];

  if (oldUrl && currentImages.includes(oldUrl)) {
    images = currentImages.map((url) => (url === oldUrl ? newUrl : url));
  } else if (fallbackIndex !== undefined && fallbackIndex >= 0 && fallbackIndex < images.length) {
    images[fallbackIndex] = newUrl;
  }

  const variations = product.variations?.map((variation) => {
    if (product.variations?.length === 1) return { ...variation, images: [...images] };

    const hasOldImage = Boolean(oldUrl && variation.images?.includes(oldUrl));
    const hasOldPrimary = Boolean(oldUrl && variation.image_url === oldUrl);
    if (!hasOldImage && !hasOldPrimary) return variation;

    return {
      ...variation,
      ...(hasOldImage && variation.images
        ? { images: variation.images.map((url) => (url === oldUrl ? newUrl : url)) }
        : {}),
      ...(hasOldPrimary ? { image_url: newUrl } : {}),
    };
  });

  return { ...product, images, ...(variations ? { variations } : {}) };
}
