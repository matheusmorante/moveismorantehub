// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ events: [] as string[], reply: null as null | ((table: string, action: string, value: any) => any) }));
vi.mock('@/pages/utils/supabaseConfig', () => ({ supabase: { from: (table: string) => {
  let action = 'read', payload: any; const filters: any = {};
  const query: any = { upsert: (value: any) => { action = 'write'; payload = value; return query; }, delete: () => { action = 'delete'; return query; }, select: () => query, single: () => query, maybeSingle: () => query, order: () => query, eq: (key: string, value: any) => { filters[key] = value; return query; },
    then: (resolve: any, reject: any) => { mocks.events.push(table + ':' + action); return Promise.resolve(mocks.reply?.(table, action, payload || filters) ?? { data: action === 'write' ? payload : action === 'delete' ? [filters] : [], error: null }).then(resolve, reject); },
  }; return query;
} } }));
import { postCreatorService } from './postCreatorService';
import { saveProductImageSelection, clearProductImageSelection } from './postProductImageSelections';
const model = { id: 'model', name: 'Logo', elementType: 'LOGO', contentKind: 'STATIC_VISUAL', opportunityId: null, prompt: '', referenceFiles: [{ id: 'ref', name: 'Logo', fileUrl: 'https://images.example/logo.png', mimeType: 'image/png' }], generationVersion: 1, status: 'NO_PREVIEW', createdAt: '2026-10-16T12:00:00Z', updatedAt: '2026-10-16T12:00:00Z' } as const;
const link = { campaignId: 'campaign', elementModelId: 'model', elementType: 'LOGO', active: true, createdAt: '2026-10-16T12:00:00Z' } as const;
const writes = [
  ['rules', () => postCreatorService.saveGlobalGuidelines('', { confirm: true })],
  ['campaign', () => postCreatorService.saveCampaign({ id: 'campaign', name: 'Campanha', active: true }, { confirm: true })],
  ['model', () => postCreatorService.saveModel({ ...model, referenceFiles: [...model.referenceFiles] }, { confirm: true })],
  ['link', () => postCreatorService.linkModel(link, { confirm: true })],
  ['delete', () => postCreatorService.removeCampaign('campaign', { confirm: true })],
] as const;
beforeEach(() => { mocks.events = []; mocks.reply = null; localStorage.clear(); });
afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });
describe('post creator confirmed operations', () => {
  it.each(writes)('confirms the exact %s receipt', async (_kind, write) => { await write(); expect(mocks.events).toHaveLength(1); });
  it.each(writes)('rejects a divergent %s receipt without publishing a local success', async (_kind, write) => {
    mocks.reply = (_table, action, payload) => ({ data: action === 'delete' ? [] : { ...payload, id: 'other', element_model_id: 'other' }, error: null });
    await expect(write()).rejects.toMatchObject({ uncertain: true }); expect(localStorage.length).toBe(0);
  });
  it('handles JSON reference key order and timestamp timezones semantically', async () => {
    mocks.reply = (_table, _action, row) => ({ data: { ...row, created_at: '2026-10-16T12:00:00+00:00', reference_files: [{ mimeType: 'image/png', fileUrl: 'https://images.example/logo.png', name: 'Logo', id: 'ref' }] }, error: null });
    await expect(writes[2][1]()).resolves.toMatchObject({ id: 'model' });
  });
  it('retains the server receipt if local caching is unavailable', async () => {
    vi.stubGlobal('localStorage', { getItem: () => null, setItem: () => { throw new Error('Storage unavailable'); } });
    await expect(writes[1][1]()).resolves.toMatchObject({ id: 'campaign' });
  });
  it('distinguishes a confirmed refusal from an uncertain transport', async () => {
    mocks.reply = () => ({ data: null, error: { code: '42501', message: 'Permission denied' } });
    await expect(writes[1][1]()).rejects.toMatchObject({ knownFailure: true, uncertain: false });
    mocks.reply = () => Promise.reject(new Error('Disconnected'));
    await expect(writes[1][1]()).rejects.toMatchObject({ uncertain: true }); expect(localStorage.length).toBe(0);
  });
  it('bounds writes and does not turn a timeout into local success', async () => {
    vi.useFakeTimers(); mocks.reply = () => new Promise(() => {}); const pending = writes[1][1](); const assertion = expect(pending).rejects.toMatchObject({ uncertain: true });
    await vi.advanceTimersByTimeAsync(20_001); await assertion; expect(localStorage.length).toBe(0);
  });
  it('does not dispatch a write for an expired context', async () => {
    await expect(postCreatorService.saveGlobalGuidelines('Texto', { confirm: true, isCurrent: () => false })).rejects.toMatchObject({ knownFailure: true }); expect(mocks.events).toEqual([]);
  });
  it('does not publish a late receipt into the next operator cache', async () => {
    let current = true; mocks.reply = (_table, _action, data) => { current = false; return { data, error: null }; };
    await expect(postCreatorService.saveCampaign({ id: 'campaign', name: 'Campanha' }, { confirm: true, isCurrent: () => current })).rejects.toMatchObject({ uncertain: true }); expect(localStorage.length).toBe(0);
  });
  it('keeps an empty confirmed read empty without implicitly creating a default campaign', async () => {
    localStorage.setItem('morante_post_creator_links_v1', JSON.stringify([link]));
    expect(await postCreatorService.campaigns({ confirm: true })).toEqual([]); expect(await postCreatorService.models({ confirm: true })).toEqual([]); expect(await postCreatorService.links('campaign', { confirm: true })).toMatchObject([{ ...link, active: false, persistedRemotely: false }]);
    expect(mocks.events.every((event) => event.endsWith(':read'))).toBe(true);
  });
  it('preserves unconfirmed local drafts and does not restore confirmed records removed remotely', async () => {
    localStorage.setItem('morante_post_creator_campaigns_v1', JSON.stringify([{ id: 'draft', name: 'Rascunho' }, { id: 'removed', name: 'Removida', persistedRemotely: true }]));
    localStorage.setItem('morante_post_creator_models_v1', JSON.stringify([{ ...model, referenceFiles: [...model.referenceFiles] }]));
    expect(await postCreatorService.campaigns({ confirm: true })).toMatchObject([{ id: 'draft', persistedRemotely: false }]);
    expect(await postCreatorService.models({ confirm: true })).toMatchObject([{ id: 'model', persistedRemotely: false }]);
    expect(JSON.parse(localStorage.getItem('morante_post_creator_campaigns_v1')!)).toHaveLength(1); expect(mocks.events.every((event) => event.endsWith(':read'))).toBe(true);
  });
  it('does not conceal an unconfirmed rules read with default content', async () => {
    mocks.reply = () => ({ data: null, error: { message: 'Offline' } }); await expect(postCreatorService.globalGuidelines({ confirm: true })).rejects.toThrow();
  });
  it('confirms image selection and clearing before returning', () => {
    const selection = { primaryUrl: 'https://images.example/photo.png' }; saveProductImageSelection('product', selection);
    expect(JSON.parse(localStorage.getItem('morante_post_image_selection_product')!)).toEqual(selection);
    clearProductImageSelection('product'); expect(localStorage.getItem('morante_post_image_selection_product')).toBeNull();
    vi.stubGlobal('localStorage', { getItem: () => 'previous', setItem: () => {}, removeItem: () => {} });
    expect(() => saveProductImageSelection('product', selection)).toThrow(/não foi salva/); expect(() => clearProductImageSelection('product')).toThrow(/não foi removida/);
  });
});
