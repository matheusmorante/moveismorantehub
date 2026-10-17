// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ events: [] as string[], reply: null as null | ((stage: string, value: any) => any), image: 'load', width: 800, height: 1000 }));
vi.mock('@/pages/utils/supabaseConfig', () => ({ supabase: {
  storage: { from: () => ({
    upload: (path: string) => { mocks.events.push('upload'); return Promise.resolve(mocks.reply?.('upload', path) ?? { data: { path }, error: null }); },
    getPublicUrl: (path: string) => ({ data: { publicUrl: 'https://images.example/' + path } }),
    remove: (paths: string[]) => { mocks.events.push('remove-file'); return Promise.resolve(mocks.reply?.('remove-file', paths) ?? { data: paths.map((name) => ({ name })), error: null }); },
  }) },
  from: () => {
    let payload: any, action = 'read'; const filters: Record<string, string> = {};
    const query: any = { insert: (value: any) => { payload = value; action = 'insert'; return query; }, delete: () => { action = 'delete'; return query; }, eq: (key: string, value: string) => { filters[key] = value; return query; }, select: () => query, single: () => query,
      then: (resolve: any, reject: any) => { mocks.events.push(action); return Promise.resolve(mocks.reply?.(action, payload || filters) ?? { data: action === 'insert' ? payload : [{ id: filters.id }], error: null }).then(resolve, reject); },
    }; return query;
  },
} }));
import { productPostsService } from './productPostsService';
const file = () => new File(['image'], 'image.png', { type: 'image/png' });
const post = { id: 'post', productId: 'product', imageStoragePath: 'product/post/image.png' } as any;
beforeEach(() => {
  mocks.events = []; mocks.reply = null; mocks.image = 'load'; mocks.width = 800; mocks.height = 1000;
  vi.stubGlobal('URL', Object.assign(class extends URL {}, { createObjectURL: vi.fn(() => 'blob:test'), revokeObjectURL: vi.fn() }));
  vi.stubGlobal('Image', class { naturalWidth = mocks.width; naturalHeight = mocks.height; onload: null | (() => void) = null; onerror: null | (() => void) = null; set src(_value: string) { void Promise.resolve().then(() => mocks.image === 'load' ? this.onload?.() : mocks.image === 'error' ? this.onerror?.() : undefined); } });
});
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

describe('post library persistence receipts', () => {
  it('validates ratio and the file before creating any remote resource', async () => {
    await expect(productPostsService.uploadPost({ productId: 'product', file: file(), format: 'STORY_STATUS_9_16' })).rejects.toMatchObject({ knownFailure: true });
    expect(mocks.events).toEqual([]);
    await expect(productPostsService.uploadPost({ productId: 'product', file: new File(['bad'], 'bad.pdf', { type: 'application/pdf' }), format: 'FEED_4_5' })).rejects.toThrow();
    expect(mocks.events).toEqual([]);
  });
  it('confirms the storage path and the same record snapshot', async () => {
    const saved = await productPostsService.uploadPost({ productId: ' product ', postId: 'post', file: file(), format: 'FEED_4_5', campaignId: '' });
    expect(saved).toMatchObject({ id: 'post', productId: 'product', campaignId: null, imageStoragePath: 'product/post/image.png', imageUrl: 'https://images.example/product/post/image.png' });
    expect(mocks.events).toEqual(['upload', 'insert']);
  });
  it('does not insert a record after an unconfirmed storage path', async () => {
    mocks.reply = (stage) => stage === 'upload' ? { data: { path: 'other-path' }, error: null } : undefined;
    await expect(productPostsService.uploadPost({ productId: 'product', file: file(), format: 'FEED_4_5' })).rejects.toMatchObject({ uncertain: true });
    expect(mocks.events).toEqual(['upload']);
  });
  it('rejects an insert receipt from another product', async () => {
    mocks.reply = (stage, row) => stage === 'insert' ? { data: { ...row, product_id: 'other' }, error: null } : undefined;
    await expect(productPostsService.uploadPost({ productId: 'product', file: file(), format: 'FEED_4_5' })).rejects.toMatchObject({ uncertain: true });
  });
  it('stops before insert if the owner changes after storage confirmation', async () => {
    let current = true;
    mocks.reply = (stage, path) => stage === 'upload' ? (current = false, { data: { path }, error: null }) : undefined;
    await expect(productPostsService.uploadPost({ productId: 'product', file: file(), format: 'FEED_4_5' }, { isCurrent: () => current })).rejects.toMatchObject({ uncertain: true });
    expect(mocks.events).toEqual(['upload']);
  });
  it('deletes the file only after the exact database row is confirmed', async () => {
    await productPostsService.deletePost(post); expect(mocks.events).toEqual(['delete', 'remove-file']);
  });
  it('never removes a file when the row deletion is unconfirmed', async () => {
    mocks.reply = (stage) => stage === 'delete' ? { data: [], error: null } : undefined;
    await expect(productPostsService.deletePost(post)).rejects.toMatchObject({ uncertain: true }); expect(mocks.events).toEqual(['delete']);
  });
  it('keeps a partial cleanup explicit and retries only storage after row confirmation', async () => {
    mocks.reply = (stage) => stage === 'remove-file' ? { data: null, error: { message: 'Storage offline' } } : undefined;
    await expect(productPostsService.deletePost(post)).rejects.toMatchObject({ recordDeleted: true });
    mocks.reply = null; mocks.events = []; await productPostsService.deletePost(post, { recordAlreadyDeleted: true }); expect(mocks.events).toEqual(['remove-file']);
  });
  it('rejects a storage path belonging to another record before any delete', async () => {
    await expect(productPostsService.deletePost({ ...post, imageStoragePath: 'product/other/image.png' })).rejects.toThrow(); expect(mocks.events).toEqual([]);
  });
  it('bounds image decoding and releases its temporary URL', async () => {
    vi.useFakeTimers(); mocks.image = 'hang'; const pending = productPostsService.validateImageRatio(file());
    await vi.advanceTimersByTimeAsync(10_001); expect(await pending).toMatchObject({ valid: false, format: null }); expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:test');
  });
  it.each(['upload', 'insert'])('bounds an unconfirmed %s without claiming persistence', async (stage) => {
    vi.useFakeTimers(); mocks.reply = (current) => current === stage ? new Promise(() => {}) : undefined;
    const pending = productPostsService.uploadPost({ productId: 'product', postId: 'post', file: file(), format: 'FEED_4_5' });
    const assertion = expect(pending).rejects.toMatchObject({ uncertain: true });
    await vi.advanceTimersByTimeAsync(stage === 'upload' ? 30_001 : 20_001); await assertion;
    expect(mocks.events).toEqual(stage === 'upload' ? ['upload'] : ['upload', 'insert']);
  });
  it('treats a rejected deletion transport as uncertain and preserves the file', async () => {
    mocks.reply = (stage) => stage === 'delete' ? Promise.reject(new Error('Disconnected')) : undefined;
    await expect(productPostsService.deletePost(post)).rejects.toMatchObject({ uncertain: true });
    expect(mocks.events).toEqual(['delete']);
  });
});
