// @vitest-environment happy-dom
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getDefaultSettings } from '@/pages/utils/settings/defaults';
const mocks = vi.hoisted(() => ({ save: vi.fn(), get: vi.fn(), subscriber: null as any, remote: null as any, ready: true, stop: vi.fn() }));
vi.mock('@/pages/utils/settingsService', () => ({ getSettings: mocks.get, saveSettings: mocks.save,
  subscribeToSettings: (callback: any, options: any) => { mocks.subscriber = callback; mocks.remote = options.onRemoteLoad; callback(mocks.get()); if (mocks.ready) options.onRemoteLoad({ confirmed: true }); return mocks.stop; },
}));
import { useSettingsForm } from './useSettingsForm';
const defer = () => { let resolve!: (value: any) => void; let reject!: (error: any) => void; const promise = new Promise<any>((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; };
beforeEach(() => { vi.resetAllMocks(); mocks.ready = true; mocks.get.mockImplementation(() => getDefaultSettings()); mocks.save.mockResolvedValue({ confirmed: true, cached: true }); });
afterEach(() => { cleanup(); vi.useRealTimers(); });

describe('settings autosave owner', () => {
  it('keeps one queued submission per draft even before React renders disabled controls', async () => {
    const pending = defer(); mocks.save.mockReturnValueOnce(pending.promise);
    const { result } = renderHook(() => useSettingsForm('operator', vi.fn()));
    act(() => result.current.handleChange('companyName', 'Empresa')); let first!: Promise<unknown>;
    await act(async () => { first = result.current.flush(); await result.current.flush(); });
    expect(mocks.save).toHaveBeenCalledTimes(1);
    await act(async () => { pending.resolve({ confirmed: true, cached: true }); await first; });
    expect(result.current.isSaving).toBe(false);
  });
  it('fails remote loading visibly and allows explicit retry without writing defaults', async () => {
    mocks.ready = false; const { result } = renderHook(() => useSettingsForm('operator', vi.fn()));
    act(() => mocks.remote({ confirmed: false, message: 'Não confirmado' }));
    expect(result.current.validationError).toBe('Não confirmado'); expect(result.current.isLoading).toBe(false);
    act(() => result.current.handleChange('companyName', 'Não salvar'));
    await act(async () => { await result.current.flush(); }); expect(mocks.save).not.toHaveBeenCalled();
    mocks.ready = true; act(() => result.current.reload()); expect(result.current.blocked).toBe(false);
  });
  it('preserves function metadata in existing import mappings until the real resolver', async () => {
    const transform = (value: unknown) => value;
    mocks.get.mockReturnValue({ ...getDefaultSettings(), importMappings: [{ id: 'mapping', name: 'Importação', entityType: 'product', delimiter: ';', mappings: [{ erpField: 'name', csvHeader: 'Nome', transform }] }] });
    const { result } = renderHook(() => useSettingsForm('operator', vi.fn()));
    act(() => result.current.handleChange('companyName', 'Empresa'));
    await act(async () => { await result.current.flush(); });
    expect(mocks.save.mock.calls[0][0].importMappings[0].mappings[0].transform).toBe(transform);
  });
  it('waits for confirmed remote loading before permitting edits', async () => {
    mocks.ready = false;
    const { result } = renderHook(() => useSettingsForm('operator', vi.fn()));
    act(() => result.current.handleChange('freightPerKm', 12));
    await act(async () => { await result.current.flush(); }); expect(mocks.save).not.toHaveBeenCalled(); expect(result.current.blocked).toBe(true);
    act(() => mocks.remote({ confirmed: true }));
    act(() => result.current.handleChange('freightPerKm', 12));
    await act(async () => { await result.current.flush(); });
    expect(mocks.save).toHaveBeenCalledWith(expect.objectContaining({ freightPerKm: 12 }), { confirm: true, isCurrent: expect.any(Function) });
  });
  it('validates the real snapshot before saving and preserves invalid draft for correction', async () => {
    const { result } = renderHook(() => useSettingsForm('operator', vi.fn()));
    act(() => result.current.handleChange('freightPerKm', Infinity));
    await act(async () => { await result.current.flush(); }); expect(mocks.save).not.toHaveBeenCalled(); expect(result.current.validationError).toMatch(/freightPerKm/);
    act(() => result.current.handleChange('freightPerKm', 0));
    await act(async () => { await result.current.flush(); }); expect(mocks.save).toHaveBeenCalledWith(expect.objectContaining({ freightPerKm: 0 }), expect.any(Object));
  });
  it('debounces multiple child changes into one submission and preserves unrelated metadata', async () => {
    vi.useFakeTimers(); const original = getDefaultSettings(); mocks.get.mockReturnValue({ ...original, customPreference: 'preserved' });
    const { result } = renderHook(() => useSettingsForm('operator', vi.fn()));
    act(() => { result.current.handleChange('companyName', 'Empresa'); result.current.handleChange('fiscalDefaults.icmsPercent', 0); });
    await act(async () => { await vi.advanceTimersByTimeAsync(1001); });
    expect(mocks.save).toHaveBeenCalledTimes(1); expect(mocks.save.mock.calls[0][0]).toMatchObject({ companyName: 'Empresa', fiscalDefaults: { icmsPercent: 0 }, customPreference: 'preserved' });
  });
  it('serializes pending saves without losing a newer local edit to its older acknowledgement', async () => {
    const first = defer(); mocks.save.mockReturnValueOnce(first.promise);
    const { result } = renderHook(() => useSettingsForm('operator', vi.fn()));
    act(() => result.current.handleChange('companyName', 'Primeira')); let pending!: Promise<unknown>, second!: Promise<unknown>;
    await act(async () => { pending = result.current.flush(); });
    act(() => result.current.handleChange('companyName', 'Segunda'));
    await act(async () => { second = result.current.flush(); }); expect(mocks.save).toHaveBeenCalledTimes(1);
    act(() => mocks.subscriber(mocks.save.mock.calls[0][0])); expect(result.current.settings.companyName).toBe('Segunda');
    await act(async () => { first.resolve({ confirmed: true, cached: true }); await pending; await second; });
    expect(mocks.save).toHaveBeenCalledTimes(2); expect(mocks.save.mock.calls[1][0].companyName).toBe('Segunda'); expect(result.current.isSaving).toBe(false);
  });
  it('keeps known save failures retryable without discarding edited values', async () => {
    mocks.save.mockRejectedValueOnce(new Error('Sem permissão'));
    const { result } = renderHook(() => useSettingsForm('operator', vi.fn()));
    act(() => result.current.handleChange('companyName', 'Empresa'));
    await act(async () => { await result.current.flush(); }); expect(result.current.validationError).toBe('Sem permissão'); expect(result.current.settings.companyName).toBe('Empresa');
    await act(async () => { await result.current.flush(); }); expect(mocks.save).toHaveBeenCalledTimes(2);
  });
  it('stops a queued newer draft after an uncertain write and releases visible loading', async () => {
    const first = defer(); mocks.save.mockReturnValueOnce(first.promise);
    const { result } = renderHook(() => useSettingsForm('operator', vi.fn()));
    act(() => result.current.handleChange('companyName', 'Primeira')); let pending!: Promise<unknown>, second!: Promise<unknown>;
    await act(async () => { pending = result.current.flush(); }); act(() => result.current.handleChange('companyName', 'Segunda'));
    await act(async () => { second = result.current.flush(); });
    await act(async () => { first.reject(Object.assign(new Error('Confirmação incerta'), { uncertain: true })); await pending; await second; });
    expect(mocks.save).toHaveBeenCalledTimes(1); expect(result.current.blocked).toBe(true); expect(result.current.isSaving).toBe(false); expect(result.current.settings.companyName).toBe('Segunda');
  });
  it('cancels pending debounce and rejects old confirmations after a change of operator', async () => {
    vi.useFakeTimers(); const { result, rerender } = renderHook((owner) => useSettingsForm(owner, vi.fn()), { initialProps: 'first' });
    act(() => result.current.handleChange('companyName', 'Primeira')); rerender('second');
    await act(async () => { await vi.advanceTimersByTimeAsync(1500); }); expect(mocks.save).not.toHaveBeenCalled();
    const pending = defer(); mocks.save.mockReturnValueOnce(pending.promise); act(() => result.current.handleChange('companyName', 'Segunda')); let operation!: Promise<unknown>;
    await act(async () => { operation = result.current.flush(); }); const guard = mocks.save.mock.calls[0][1].isCurrent;
    rerender('third'); expect(guard()).toBe(false);
    await act(async () => { pending.resolve({ confirmed: false, cached: false }); await operation; }); expect(result.current.validationError).toBeNull();
  });
  it('preserves a draft during external updates and clears timers on unmount', async () => {
    vi.useFakeTimers(); const view = renderHook(() => useSettingsForm('operator', vi.fn()));
    act(() => view.result.current.handleChange('companyName', 'Minha edição'));
    act(() => mocks.subscriber({ ...getDefaultSettings(), companyName: 'Antiga', companyPhone: 'Novo telefone' }));
    expect(view.result.current.settings).toMatchObject({ companyName: 'Minha edição', companyPhone: 'Novo telefone' });
    view.unmount(); await act(async () => { await vi.advanceTimersByTimeAsync(1500); }); expect(mocks.save).not.toHaveBeenCalled(); expect(mocks.stop).toHaveBeenCalled();
  });
});
