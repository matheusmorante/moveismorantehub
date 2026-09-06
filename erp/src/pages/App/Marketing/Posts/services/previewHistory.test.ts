import { describe, expect, it } from 'vitest';
import { PostPreviewCache } from '../types/postCreator';
import { previewIdsToPrune } from './previewHistory';

const preview = (id: number, extra: Partial<PostPreviewCache> = {}): PostPreviewCache => ({
  id: String(id), campaignId: 'campaign', productId: 'product', format: '4:5', inputHash: String(id),
  imageUrl: `image-${id}`, status: 'UPDATED', accepted: false, pinned: false,
  createdAt: new Date(2026, 0, id).toISOString(), updatedAt: new Date(2026, 0, id).toISOString(), ...extra,
});

describe('previewIdsToPrune', () => {
  it('remove o mais antigo não protegido ao ultrapassar dez gerações', () => {
    expect(previewIdsToPrune(Array.from({ length: 11 }, (_, index) => preview(index + 1)))).toEqual(['1']);
  });

  it('preserva gerações aceitas e fixadas', () => {
    const values = Array.from({ length: 12 }, (_, index) => preview(index + 1, index === 0 ? { accepted: true } : index === 1 ? { pinned: true } : {}));
    expect(previewIdsToPrune(values)).toEqual(['3', '4']);
  });
});
