// @vitest-environment happy-dom
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ read: vi.fn(), save: vi.fn(), user: { id: 'operator' } }));
vi.mock('@/context/AuthContext', () => ({ useAuth: () => ({ user: mocks.user }) }));
vi.mock('../../services/templateService', () => ({ templateService: { getAll: mocks.read, save: mocks.save } }));
import { useTemplateWorkspace } from './useTemplateWorkspace';
import { compositionTemplate } from '../../services/compositionDefaults';
const deferred = () => { let resolve!: (value: any) => void; const promise = new Promise<any>((yes) => { resolve = yes; }); return { promise, resolve }; };
const campaign = (id = 'campaign') => ({ id, name: 'Campanha', slug: id, active: true, createdAt: '2026-10-16T12:00:00Z', updatedAt: '2026-10-16T12:00:00Z' });
const loaded = async (id = 'campaign') => { let hook!: ReturnType<typeof renderHook<ReturnType<typeof useTemplateWorkspace>, unknown>>; await act(async () => { hook = renderHook(() => useTemplateWorkspace(campaign(id), '4:5')); }); return hook; };
const flush = () => act(async () => { await vi.advanceTimersByTimeAsync(701); });
beforeEach(() => { vi.useFakeTimers(); vi.resetAllMocks(); mocks.user = { id: 'operator' }; mocks.read.mockResolvedValue([]); mocks.save.mockImplementation(async (values) => ({ ...values, persistedRemotely: true })); });
afterEach(() => { cleanup(); vi.useRealTimers(); });
describe('retained template workspace owner and actual autosave queue', () => {
  it('does not submit on initial load and saves parsed settings with both layouts', async () => {
    const { result } = await loaded(); await flush(); expect(mocks.save).not.toHaveBeenCalled();
    act(() => result.current.setSettings({ sampleSlogan: 'Exemplo' })); expect(result.current.canonicalTemplate.editorSettings?.sampleSlogan).toBe('Exemplo');
    await flush(); expect(mocks.save).toHaveBeenCalledOnce(); expect(mocks.save.mock.calls[0][0]).toMatchObject({ editorSettings: { sampleSlogan: 'Exemplo' }, layouts: { '4:5': { targetHeight: 1350 }, '9:16': { targetHeight: 1920 } } }); expect(mocks.save.mock.calls[0][1]).toMatchObject({ confirm: true }); expect(result.current.status).toBe('Todas as alterações foram salvas.');
  });
  it('rejects invalid layers before service or local cache mutation', async () => {
    const { result } = await loaded(); act(() => result.current.setLayers((layers) => layers.map((layer, index) => index === 0 ? { ...layer, opacity: 2 } : layer))); await flush();
    expect(mocks.save).not.toHaveBeenCalled(); expect(result.current.status).not.toContain('Todas as alterações'); expect(result.current.status).not.toContain('aguardando');
  });
  it('coalesces edits before dispatch and awaits the resolver through persistence', async () => {
    const pending = deferred(); mocks.save.mockReturnValueOnce(pending.promise); const { result } = await loaded();
    act(() => result.current.setSettings({ sampleSlogan: 'A' })); await act(async () => { await vi.advanceTimersByTimeAsync(300); }); act(() => result.current.setSettings({ sampleSlogan: 'B' })); await flush();
    expect(mocks.save).toHaveBeenCalledOnce(); expect(mocks.save.mock.calls[0][0].editorSettings.sampleSlogan).toBe('B'); expect(result.current.status).toBe('Salvando automaticamente…');
    act(() => result.current.setSettings({ sampleSlogan: 'C' })); await flush(); expect(mocks.save).toHaveBeenCalledOnce();
    await act(async () => { pending.resolve({ ...mocks.save.mock.calls[0][0], persistedRemotely: true }); }); expect(mocks.save).toHaveBeenCalledTimes(2); expect(mocks.save.mock.calls[1][0].editorSettings.sampleSlogan).toBe('C'); expect(result.current.status).toBe('Todas as alterações foram salvas.');
  });
  it('keeps the latest edit after a known refusal and retries explicitly with its original id', async () => {
    mocks.save.mockRejectedValueOnce(Object.assign(new Error('Recusado'), { knownFailure: true })); const { result } = await loaded();
    act(() => result.current.setSettings({ sampleSlogan: 'Exemplo' })); await flush(); expect(result.current.status).toBe('Recusado');
    act(() => result.current.retrySave()); await flush(); expect(mocks.save).toHaveBeenCalledTimes(2); expect(mocks.save.mock.calls[0][0].id).toBe(mocks.save.mock.calls[1][0].id); expect(result.current.status).toBe('Todas as alterações foram salvas.');
  });
  it('blocks later queued writes after an uncertain result', async () => {
    mocks.save.mockRejectedValueOnce(Object.assign(new Error('Sem confirmação'), { uncertain: true })); const { result } = await loaded();
    act(() => result.current.setSettings({ sampleSlogan: 'Exemplo' })); await flush(); expect(result.current.status).toBe('Sem confirmação');
    act(() => result.current.setSettings({ sampleSlogan: 'Outro' })); await flush(); expect(mocks.save).toHaveBeenCalledOnce(); expect(result.current.status).toMatch(/sem confirmação/);
  });
  it('bounds an uncertain persistence callback and blocks replay', async () => {
    mocks.save.mockReturnValueOnce(new Promise(() => {})); const { result } = await loaded(); act(() => result.current.setSettings({ sampleSlogan: 'Exemplo' })); await flush();
    await act(async () => { await vi.advanceTimersByTimeAsync(25_001); }); expect(result.current.status).toMatch(/não foi confirmado/);
    act(() => result.current.retrySave()); await flush(); expect(mocks.save).toHaveBeenCalledOnce();
  });
  it('cancels an undispatched autosave on unmount', async () => {
    const { result, unmount } = await loaded(); act(() => result.current.setSettings({ sampleSlogan: 'Exemplo' })); unmount(); await flush(); expect(mocks.save).not.toHaveBeenCalled();
  });
  it('does not publish an old campaign load over the latest campaign', async () => {
    const pending = deferred(); mocks.read.mockReturnValueOnce(pending.promise).mockResolvedValue([]); let hook!: ReturnType<typeof renderHook<ReturnType<typeof useTemplateWorkspace>, { id: string }>>;
    await act(async () => { hook = renderHook(({ id }) => useTemplateWorkspace(campaign(id), '4:5'), { initialProps: { id: 'old' } }); });
    await act(async () => { hook.rerender({ id: 'new' }); pending.resolve([{ ...compositionTemplate, id: 'old-template', campaignId: 'old', isDefault: false }]); }); expect(hook.result.current.canonicalTemplate.campaignId).toBe('new'); expect(hook.result.current.loading).toBe(false);
  });
  it('bounds loading, releases the state and allows explicit reload', async () => {
    mocks.read.mockReturnValueOnce(new Promise(() => {})); const { result } = await loaded(); await act(async () => { await vi.advanceTimersByTimeAsync(20_001); });
    expect(result.current.loading).toBe(false); expect(result.current.status).toMatch(/não foi confirmada/); act(() => result.current.setSettings({ sampleSlogan: 'No template' })); await flush(); expect(mocks.save).not.toHaveBeenCalled();
    await act(async () => { result.current.reload(); }); expect(result.current.status).toBe('Salvamento automático ativo.');
  });
  it('keeps local-only confirmation explicit instead of claiming synchronization', async () => {
    mocks.save.mockImplementation(async (values) => ({ ...values, persistedRemotely: false })); const { result } = await loaded(); act(() => result.current.setSettings({ sampleSlogan: 'Exemplo' })); await flush(); expect(result.current.status).toMatch(/Salvo neste navegador/);
  });
  it('ignores a late save after an operator change and cancels the old pending edit', async () => {
    const pending = deferred(); mocks.save.mockReturnValueOnce(pending.promise); const { result, rerender } = await loaded(); act(() => result.current.setSettings({ sampleSlogan: 'Anterior' })); await flush();
    act(() => result.current.setSettings({ sampleSlogan: 'Pendente' })); mocks.user = { id: 'other' }; await act(async () => { rerender(); pending.resolve({ ...mocks.save.mock.calls[0][0], persistedRemotely: true }); }); await flush();
    expect(mocks.save).toHaveBeenCalledOnce(); expect(result.current.canonicalTemplate.editorSettings?.sampleSlogan).toBeUndefined(); expect(result.current.status).toBe('Salvamento automático ativo.');
  });
});
