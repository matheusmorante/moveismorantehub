export interface PostModelPreviewCacheEntry { image: string; hash: string; generatedAt?: string; provider?: string }

export function getPostModelPreviewCacheKey(modelId: string, productId: string, format: '4:5' | '9:16'): string {
  return `morante_post_model_preview:${modelId}:${productId}:${format}`;
}

export function readPostModelPreviewCache(key: string): PostModelPreviewCacheEntry | null {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(key) || 'null');
    if (!value || typeof value !== 'object' || !('image' in value) || typeof value.image !== 'string') return null;
    return { image: value.image, hash: 'hash' in value && typeof value.hash === 'string' ? value.hash : '' };
  } catch { return null; }
}

export function writePostModelPreviewCache(key: string, entry: PostModelPreviewCacheEntry): void {
  localStorage.setItem(key, JSON.stringify(entry));
}
