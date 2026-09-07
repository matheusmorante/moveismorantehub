export function extractPostProductImageUrls(raw: unknown): string[] {
  if (!raw) return [];
  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      try {
        const parsed: unknown = JSON.parse(trimmed);
        if (Array.isArray(parsed)) return extractPostProductImageUrls(parsed);
      } catch { /* trata como texto simples */ }
    }
    return trimmed.split(',').map(value => value.trim()).filter(Boolean);
  }
  if (Array.isArray(raw)) {
    const urls: string[] = [];
    raw.forEach(item => {
      if (!item) return;
      if (typeof item === 'string') urls.push(item);
      else if (Array.isArray(item) && item[1]) urls.push(String(item[1]));
      else if (typeof item === 'object' && 'url' in item && item.url) urls.push(String(item.url));
      else if (typeof item === 'object' && 'image_url' in item && item.image_url) urls.push(String(item.image_url));
    });
    return urls;
  }
  if (typeof raw === 'object' && 'url' in raw && raw.url) return [String(raw.url)];
  if (typeof raw === 'object' && 'image_url' in raw && raw.image_url) return [String(raw.image_url)];
  return [];
}
