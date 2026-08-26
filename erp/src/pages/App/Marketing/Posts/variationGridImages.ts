export type ProductVariationImages = { id: string; image_url?: unknown };
export type GridImageSource = { key: string; url: string };
export type ProductImage = { image_url?: unknown; is_main?: boolean };

export function parseVariationImageUrls(value: unknown) {
  const urls: string[] = [];
  const append = (item: unknown) => {
    if (typeof item === 'string' && item.trim()) urls.push(item.trim());
    else if (item && typeof item === 'object') {
      const record = item as { url?: unknown; image_url?: unknown };
      if (typeof record.url === 'string' && record.url.trim()) urls.push(record.url.trim());
      else if (typeof record.image_url === 'string' && record.image_url.trim()) urls.push(record.image_url.trim());
    }
  };
  if (Array.isArray(value)) value.forEach(append);
  else if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) parsed.forEach(append);
      else value.split(',').forEach(append);
    } catch {
      value.split(',').forEach(append);
    }
  }
  return [...new Set(urls)];
}

function source(variation: ProductVariationImages | undefined, imageIndex: number): GridImageSource | null {
  if (!variation) return null;
  const url = parseVariationImageUrls(variation.image_url)[imageIndex];
  return url ? { key: `variation:${variation.id}:${imageIndex}`, url } : null;
}

export function getVariationGridImages(variations: ProductVariationImages[]) {
  if (!variations.length) return null;
  const main = source(variations[0], 0);
  // Ordem fixa do grid: V1/Imagem 1, V1/Imagem 2, depois Imagem 1 de
  // cada variação seguinte. Nenhuma imagem é repetida como fallback de slot.
  const secondary = source(variations[0], 1);
  const extra = variations.slice(1)
    .map(variation => source(variation, 0))
    .filter((item): item is GridImageSource => Boolean(item));
  return { main, secondary, extra, hasMoreColors: false };
}

/**
 * Ordem fixa do grid de posts:
 * - sem variações: somente imagens 1, 2 e 3 do próprio produto;
 * - com variações: V1/imagem 1, V1/imagem 2 e imagem 1 das demais variações.
 */
export function getPostGridImages(productImages: ProductImage[], variations: ProductVariationImages[]) {
  const variationImages = getVariationGridImages(variations);
  if (variationImages) return variationImages;

  const images = [...productImages]
    .sort((first, second) => Number(Boolean(second.is_main)) - Number(Boolean(first.is_main)))
    .flatMap(image => parseVariationImageUrls(image.image_url))
    .map((url, index) => ({ key: `product:${index}`, url }));

  return {
    main: images[0] || null,
    secondary: images[1] || null,
    extra: images.slice(2, 3),
    hasMoreColors: false,
  };
}
