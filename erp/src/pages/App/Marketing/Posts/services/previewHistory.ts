import { PostPreviewCache } from '../types/postCreator';

export const PREVIEW_HISTORY_LIMIT = 10;

export function previewsForContext(
  previews: PostPreviewCache[],
  campaignId: string,
  productId: string,
  format: PostPreviewCache['format'],
) {
  return previews
    .filter(item => item.campaignId === campaignId && item.productId === productId && item.format === format)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function previewIdsToPrune(previews: PostPreviewCache[], limit = PREVIEW_HISTORY_LIMIT): string[] {
  if (previews.length <= limit) return [];
  const removable = [...previews]
    .filter(item => !item.accepted && !item.pinned)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  return removable.slice(0, Math.min(previews.length - limit, removable.length)).map(item => item.id);
}
