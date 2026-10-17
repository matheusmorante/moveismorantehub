// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ insert: vi.fn(), reply: null as null | ((value: any) => any) }));
vi.mock('@/pages/utils/supabaseConfig', () => ({ supabase: { from: () => {
  let payload: any;
  const query: any = { insert: (value: any) => { payload = value; mocks.insert(value); return query; }, select: () => query, single: () => query,
    then: (resolve: any, reject: any) => Promise.resolve(mocks.reply?.(payload) ?? { data: payload, error: null }).then(resolve, reject),
  }; return query;
} } }));
import { ambientationService } from './ambientationService';
const key = 'morante_ambiented_images_v1';
const record = { id: '7cd4726a-116f-493c-a921-27361639cc4d', productId: 'product', originalImageUrl: 'https://images.example/original.png', ambientedImageUrl: 'https://images.example/room.png', promptUsed: 'Quarto claro' };
beforeEach(() => { vi.resetAllMocks(); mocks.reply = null; localStorage.clear(); });
afterEach(() => { vi.restoreAllMocks(); vi.useRealTimers(); vi.unstubAllGlobals(); });

describe('ambientation persistence receipts', () => {
  it('validates the image and sends parsed values before persistence', async () => {
    await expect(ambientationService.saveAmbientedImage({ ...record, ambientedImageUrl: 'javascript:invalid' })).rejects.toThrow();
    expect(mocks.insert).not.toHaveBeenCalled();
    const result = await ambientationService.saveAmbientedImage({ ...record, productId: ' product ', promptUsed: ' Quarto claro ' });
    expect(result).toMatchObject({ ...record, persistence: 'remote' }); expect(mocks.insert.mock.calls[0][0].product_id).toBe('product');
  });
  it('requires the same remote snapshot before claiming success', async () => {
    mocks.reply = (payload) => ({ data: { ...payload, product_id: 'other' }, error: null });
    await expect(ambientationService.saveAmbientedImage(record)).rejects.toMatchObject({ uncertain: true }); expect(localStorage.getItem(key)).toBeNull();
  });
  it('preserves a confirmed remote save even if the local cache is unavailable', async () => {
    vi.stubGlobal('localStorage', { getItem: () => null, setItem: () => { throw new Error('SecurityError'); } });
    await expect(ambientationService.saveAmbientedImage(record)).resolves.toMatchObject({ persistence: 'remote' });
  });
  it('makes the confirmed local fallback explicit and preserves a stable identity', async () => {
    mocks.reply = () => ({ data: null, error: { code: '42P01' } });
    await expect(ambientationService.saveAmbientedImage(record)).resolves.toMatchObject({ persistence: 'local' });
    await ambientationService.saveAmbientedImage(record);
    expect(JSON.parse(localStorage.getItem(key)!)).toHaveLength(1); expect(JSON.parse(localStorage.getItem(key)!)[0].id).toBe(record.id);
  });
  it('rejects an unconfirmed local fallback instead of manufacturing a receipt', async () => {
    mocks.reply = () => ({ data: null, error: { code: '42501' } });
    vi.stubGlobal('localStorage', { getItem: () => null, setItem: () => {} });
    await expect(ambientationService.saveAmbientedImage(record)).rejects.toMatchObject({ knownFailure: true });
  });
  it('does not replace an uncertain transport with a local success', async () => {
    mocks.reply = () => Promise.reject(new Error('Disconnected'));
    await expect(ambientationService.saveAmbientedImage(record)).rejects.toMatchObject({ uncertain: true }); expect(localStorage.getItem(key)).toBeNull();
  });
  it('bounds an uncertain save without claiming success or writing the cache', async () => {
    vi.useFakeTimers(); mocks.reply = () => new Promise(() => {});
    const pending = ambientationService.saveAmbientedImage(record); const assertion = expect(pending).rejects.toMatchObject({ uncertain: true });
    await vi.advanceTimersByTimeAsync(20_001); await assertion; expect(localStorage.getItem(key)).toBeNull();
  });
  it('stops cache writes after an operator or product change', async () => {
    let current = true; mocks.reply = (data) => { current = false; return { data, error: null }; };
    await expect(ambientationService.saveAmbientedImage(record, { isCurrent: () => current })).rejects.toMatchObject({ uncertain: true }); expect(localStorage.getItem(key)).toBeNull();
  });
});
