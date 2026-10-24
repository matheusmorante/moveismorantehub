/** Normalizes current and legacy image fields without losing unique URL order. */
export const parseVariationImages = (rawImageUrl: unknown, rawImages?: unknown): string[] => {
  const candidates: unknown[] = [];

  if (rawImages) {
    if (Array.isArray(rawImages)) candidates.push(...rawImages);
    else candidates.push(rawImages);
  }

  if (rawImageUrl) {
    if (Array.isArray(rawImageUrl)) candidates.push(...rawImageUrl);
    else candidates.push(rawImageUrl);
  }

  const result: string[] = [];
  const add = (value: unknown) => {
    const clean = String(value).trim().replace(/^['"]|['"]$/g, '');
    if (clean && !result.includes(clean)) result.push(clean);
  };

  candidates.forEach((item) => {
    if (!item) return;
    if (typeof item === 'string') {
      const trimmed = item.trim();
      if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
        try {
          const parsed: unknown = JSON.parse(trimmed);
          if (Array.isArray(parsed)) {
            parsed.forEach(add);
            return;
          }
        } catch {
          // A malformed legacy JSON value falls back to the comma-separated format.
        }
      }
      trimmed.split(',').forEach(add);
    } else if (typeof item === 'object') {
      const image = item as { url?: unknown; image_url?: unknown };
      add(image.url || image.image_url || item);
    }
  });

  return result;
};
