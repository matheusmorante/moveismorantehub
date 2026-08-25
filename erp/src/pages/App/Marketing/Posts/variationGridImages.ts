export type ProductVariationImages = { id: string; image_url?: unknown };
export type GridImageSource = { key: string; url: string };

export function parseVariationImageUrls(value: unknown) {
  const urls: string[] = [];
  const append = (item: unknown) => {
    if (typeof item === 'string' && item.trim()) urls.push(item.trim());
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
  const secondary = source(variations[0], 1)
    || source(variations[1], 1)
    || source(variations[1], 0)
    || main;
  const extra = [source(variations[1], 0), source(variations[2], 0)]
    .filter((item): item is GridImageSource => Boolean(item));
  const hasMoreColors = variations.slice(3).some(variation => parseVariationImageUrls(variation.image_url).length > 0);
  return { main, secondary, extra, hasMoreColors };
}
