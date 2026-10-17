// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ reply: null as null | ((value: any) => any), writes: [] as any[] }));
vi.mock('@/pages/utils/supabaseConfig', () => ({ supabase: { from: () => {
  let payload: any; const query: any = { upsert: (value: any) => { payload = value; return query; }, select: () => query, single: () => query,
    then: (resolve: any, reject: any) => { mocks.writes.push(payload); return Promise.resolve(mocks.reply?.(payload) ?? { data: payload, error: null }).then(resolve, reject); },
  }; return query;
} } }));
import { templateService } from './templateService';
import { compositionTemplate } from './compositionDefaults';
const value = () => ({ ...compositionTemplate, id: 'template', name: ' Modelo ', isDefault: false, updatedAt: '2026-10-16T12:00:00Z' });
beforeEach(() => { mocks.reply = null; mocks.writes = []; localStorage.clear(); });
afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });
describe('template confirmation boundary', () => {
  it('parses explicit template rules before I/O', async () => {
    await expect(templateService.save({ ...value(), targetWidth: 0 }, { confirm: true })).rejects.toThrow(); expect(mocks.writes).toEqual([]);
    await expect(templateService.save(value(), { confirm: true })).resolves.toMatchObject({ id: 'template', name: 'Modelo', persistedRemotely: true });
  });
  it('requires the same template snapshot and keeps an uncertain local draft explicit', async () => {
    mocks.reply = (payload) => ({ data: { ...payload, layers_json: [] }, error: null });
    await expect(templateService.save(value(), { confirm: true })).rejects.toMatchObject({ uncertain: true, locallySaved: true });
    expect(JSON.parse(localStorage.getItem('morante_marketing_templates_v1')!)[0].persistedRemotely).toBe(false);
  });
  it('compares JSON key order and timestamp timezones semantically', async () => {
    mocks.reply = (payload) => ({ data: { ...payload, updated_at: '2026-10-16T12:00:00+00:00', layers_json: payload.layers_json.map((layer: any) => Object.fromEntries(Object.entries(layer).reverse())) }, error: null });
    await expect(templateService.save(value(), { confirm: true })).resolves.toMatchObject({ persistedRemotely: true });
  });
  it('returns a confirmed local-only save for an explicit server refusal', async () => {
    mocks.reply = () => ({ data: null, error: { code: '42501' } });
    await expect(templateService.save(value(), { confirm: true })).resolves.toMatchObject({ persistedRemotely: false });
  });
  it('does not manufacture local success if storage and server both refuse', async () => {
    vi.stubGlobal('localStorage', { getItem: () => null, setItem: () => {} }); mocks.reply = () => ({ data: null, error: { code: '42501' } });
    await expect(templateService.save(value(), { confirm: true })).rejects.toMatchObject({ knownFailure: true });
  });
  it('preserves an unreadable local history when the server refuses persistence', async () => {
    localStorage.setItem('morante_marketing_templates_v1', '{invalid'); mocks.reply = () => ({ data: null, error: { code: '42501' } });
    await expect(templateService.save(value(), { confirm: true })).rejects.toMatchObject({ knownFailure: true }); expect(localStorage.getItem('morante_marketing_templates_v1')).toBe('{invalid');
  });
  it('preserves a confirmed remote receipt when local storage is unavailable', async () => {
    vi.stubGlobal('localStorage', { getItem: () => null, setItem: () => { throw new Error('Storage unavailable'); } });
    await expect(templateService.save(value(), { confirm: true })).resolves.toMatchObject({ persistedRemotely: true });
  });
  it('does not convert a rejected transport to local success', async () => {
    mocks.reply = () => Promise.reject(new Error('Disconnected'));
    await expect(templateService.save(value(), { confirm: true })).rejects.toMatchObject({ uncertain: true });
  });
  it('bounds persistence and retains its uncertain status', async () => {
    vi.useFakeTimers(); mocks.reply = () => new Promise(() => {}); const pending = templateService.save(value(), { confirm: true }); const assertion = expect(pending).rejects.toMatchObject({ uncertain: true });
    await vi.advanceTimersByTimeAsync(20_001); await assertion;
  });
  it('rejects an old session before I/O and after a late receipt', async () => {
    await expect(templateService.save(value(), { confirm: true, isCurrent: () => false })).rejects.toMatchObject({ knownFailure: true }); expect(mocks.writes).toEqual([]);
    let current = true; mocks.reply = (data) => { current = false; return { data, error: null }; };
    await expect(templateService.save(value(), { confirm: true, isCurrent: () => current })).rejects.toMatchObject({ uncertain: true });
  });
});
