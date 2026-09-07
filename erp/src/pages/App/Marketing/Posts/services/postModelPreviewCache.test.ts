import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getPostModelPreviewCacheKey, readPostModelPreviewCache, writePostModelPreviewCache } from './postModelPreviewCache';

const values = new Map<string, string>();
beforeEach(() => { values.clear(); vi.stubGlobal('localStorage', { getItem: (key: string) => values.get(key) || null, setItem: (key: string, value: string) => values.set(key, value) }); });

describe('postModelPreviewCache', () => {
  it('mantém uma chave por modelo, produto e formato', () => expect(getPostModelPreviewCacheKey('model', 'product', '4:5')).toBe('morante_post_model_preview:model:product:4:5'));
  it('lê o cache válido e ignora conteúdo inválido', () => {
    const key = getPostModelPreviewCacheKey('model', 'product', '9:16');
    writePostModelPreviewCache(key, { image: 'data:image/png', hash: 'hash' });
    expect(readPostModelPreviewCache(key)).toEqual({ image: 'data:image/png', hash: 'hash' });
    values.set(key, '{'); expect(readPostModelPreviewCache(key)).toBeNull();
  });
});
