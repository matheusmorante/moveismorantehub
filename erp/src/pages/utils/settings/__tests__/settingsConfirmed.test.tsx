// @vitest-environment happy-dom
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { supabase } from '@/pages/utils/supabaseConfig';
import { useLabelLayouts } from '@/pages/App/Stock/LabelPrinting/hooks/useLabelLayouts';
import type { CategoryType } from '@/pages/App/Stock/LabelPrinting/hooks/useLabelCategory';
import { DEFAULT_LAYOUT_MODELS } from '@/pages/App/Stock/LabelPrinting/utils/LabelConstants';
import { getSettings, saveSettings, subscribeToSettings } from '../storage';
import { SETTINGS_KEY } from '../defaults';
import type { AppSettings } from '../types';

vi.mock('@/pages/utils/supabaseConfig', () => ({ supabase: { from: vi.fn() } }));
vi.mock('react-toastify', () => ({ toast: { success: vi.fn(), info: vi.fn(), error: vi.fn() } }));
vi.mock('@/pages/App/Stock/LabelPrinting/services/priceLabelTemplateSync', () => ({ subscribeToPriceLabelTemplateUpdates: () => () => undefined }));
type Row = { id: string; data: AppSettings };
type Response = { data: unknown; error: unknown; status?: number };
const transport = { read: vi.fn<() => Promise<Response>>(), write: vi.fn<(row: Row) => Promise<Response>>() };
function deferred<T>() { let resolve!: (value: T) => void; const promise = new Promise<T>((done) => { resolve = done; }); return { promise, resolve }; }
const ack = (row: Row): Response => ({ data: row, error: null, status: 200 });
const changedSettings = () => ({ ...getSettings(), defaultLabelLayoutIds: { identificacao_rect: 'ident_2x5' } });
const unsubscribers: Array<() => void> = [];
beforeEach(() => {
  vi.clearAllMocks(); localStorage.clear(); vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  transport.read.mockReset().mockResolvedValue({ data: null, error: null });
  transport.write.mockReset().mockImplementation(async (row) => ack(row));
  vi.mocked(supabase.from).mockImplementation((table) => {
    if (table === 'label_layouts') return { select: async () => ({ data: [], error: null }) } as never;
    if (table !== 'settings') throw new Error(`Transporte inesperado: ${table}`);
    let row: Row | undefined;
    const query = { upsert: (value: Row) => { row = value; return query; }, select: () => query, eq: () => query,
      single: () => row ? transport.write(row) : transport.read() };
    return query as never;
  });
});
afterEach(() => { cleanup(); for (const unsubscribe of unsubscribers.splice(0)) unsubscribe(); vi.useRealTimers(); vi.restoreAllMocks(); });

describe('confirmação optativa de configurações e preferência real de etiquetas', () => {
  it('confirma consultas simultâneas equivalentes sem publicar a mesma leitura duas vezes', async () => {
    const first = deferred<Response>(), second = deferred<Response>();
    const settings = changedSettings(), observer = vi.fn(), loaded = [vi.fn(), vi.fn()];
    transport.read.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
    unsubscribers.push(subscribeToSettings(observer, { onRemoteLoad: loaded[0] }));
    unsubscribers.push(subscribeToSettings(vi.fn(), { onRemoteLoad: loaded[1] }));
    first.resolve(ack({ id: 'app', data: settings }));
    await waitFor(() => expect(loaded[0]).toHaveBeenCalledWith({ confirmed: true }));
    const publications = observer.mock.calls.length;
    second.resolve(ack({ id: 'app', data: Object.fromEntries(Object.entries(settings).reverse()) as AppSettings }));
    await waitFor(() => expect(loaded[1]).toHaveBeenCalledWith({ confirmed: true }));
    expect(observer).toHaveBeenCalledTimes(publications);
  });
  it.each(['different-read', 'intervening-write'])('não confirma consulta antiga após %s', async (scenario) => {
    const first = deferred<Response>(), second = deferred<Response>();
    const settings = changedSettings(), loaded = [vi.fn(), vi.fn()];
    transport.read.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
    unsubscribers.push(subscribeToSettings(vi.fn(), { onRemoteLoad: loaded[0] }));
    unsubscribers.push(subscribeToSettings(vi.fn(), { onRemoteLoad: loaded[1] }));
    first.resolve(ack({ id: 'app', data: settings }));
    await waitFor(() => expect(loaded[0]).toHaveBeenCalledWith({ confirmed: true }));
    if (scenario === 'intervening-write') await saveSettings(settings, { confirm: true });
    second.resolve(ack({ id: 'app', data: scenario === 'different-read' ? { ...settings, companyUF: 'SC' } : settings }));
    await waitFor(() => expect(loaded[1]).toHaveBeenCalledWith({ confirmed: false, message: expect.stringContaining('mudou') }));
    expect(getSettings().companyUF).toBe(settings.companyUF);
  });
  it('reports remote load confirmation even when local cache is unavailable', async () => {
    const settings = changedSettings(), observer = vi.fn(), loaded = vi.fn();
    transport.read.mockResolvedValue({ data: { id: 'app', data: settings }, error: null });
    vi.spyOn(localStorage, 'setItem').mockImplementation(() => { throw new Error('Quota'); });
    unsubscribers.push(subscribeToSettings(observer, { onRemoteLoad: loaded }));
    await waitFor(() => expect(loaded).toHaveBeenCalledWith({ confirmed: true }));
    expect(observer.mock.calls.at(-1)?.[0].defaultLabelLayoutIds).toEqual(settings.defaultLabelLayoutIds);
  });
  it('reports a bounded failed query without claiming the local fallback was confirmed', async () => {
    vi.useFakeTimers(); transport.read.mockReturnValue(new Promise(() => {})); const loaded = vi.fn();
    unsubscribers.push(subscribeToSettings(vi.fn(), { onRemoteLoad: loaded }));
    await vi.advanceTimersByTimeAsync(15_001);
    expect(loaded).toHaveBeenCalledWith({ confirmed: false, message: expect.any(String) });
  });
  it('não publica/cacheia antes de confirmar a linha e conserva contrato legado', async () => {
    const request = deferred<Response>(); transport.write.mockReturnValueOnce(request.promise);
    const settings = changedSettings(), pending = saveSettings(settings, { confirm: true });
    expect(localStorage.getItem(SETTINGS_KEY)).toBeNull(); const row = transport.write.mock.calls[0][0];
    request.resolve(ack(row)); expect(await pending).toEqual({ confirmed: true, cached: true });
    expect(getSettings().defaultLabelLayoutIds).toEqual(settings.defaultLabelLayoutIds);
  });

  it('preserva rejeição conhecida e classifica ACK divergente/cardinalidade/transporte como incertos', async () => {
    transport.write.mockResolvedValueOnce({ data: null, error: { code: '42501' }, status: 403 });
    await expect(saveSettings(changedSettings(), { confirm: true })).rejects.toThrow('permissões');
    for (const response of [{ data: null, error: null }, { data: { id: 'outro', data: {} }, error: null }, { data: null, error: { code: 'PGRST116' } }]) {
      transport.write.mockResolvedValueOnce(response);
      await expect(saveSettings(changedSettings(), { confirm: true })).rejects.toMatchObject({ uncertain: true });
    }
    transport.write.mockRejectedValueOnce(new TypeError('network'));
    await expect(saveSettings(changedSettings(), { confirm: true })).rejects.toMatchObject({ uncertain: true });
    expect(localStorage.getItem(SETTINGS_KEY)).toBeNull();
  });

  it('libera a espera em 20s sem publicar confirmação tardia', async () => {
    vi.useFakeTimers(); const request = deferred<Response>(); transport.write.mockReturnValueOnce(request.promise);
    const pending = saveSettings(changedSettings(), { confirm: true }); const check = expect(pending).rejects.toMatchObject({ uncertain: true });
    await vi.advanceTimersByTimeAsync(20_000); await check; request.resolve(ack(transport.write.mock.calls[0][0])); await Promise.resolve();
    expect(localStorage.getItem(SETTINGS_KEY)).toBeNull();
  });

  it('ignora confirmação de proprietário antigo e conserva incerteza do mesmo contexto antigo', async () => {
    let current = true; const request = deferred<Response>(); transport.write.mockReturnValueOnce(request.promise);
    const pending = saveSettings(changedSettings(), { confirm: true, isCurrent: () => current }); current = false;
    request.resolve(ack(transport.write.mock.calls[0][0])); expect(await pending).toEqual({ confirmed: false, cached: false });
    transport.write.mockResolvedValueOnce({ data: null, error: { code: '08006' } }); current = true;
    const uncertain = saveSettings(changedSettings(), { confirm: true, isCurrent: () => current }); current = false;
    await expect(uncertain).rejects.toMatchObject({ uncertain: true }); expect(localStorage.getItem(SETTINGS_KEY)).toBeNull();
  });

  it('não deixa SELECT inicial atrasado desfazer gravação confirmada nem aplica após unsubscribe', async () => {
    const request = deferred<Response>(), old = getSettings(), observer = vi.fn(); transport.read.mockReturnValueOnce(request.promise);
    const unsubscribe = subscribeToSettings(observer); unsubscribers.push(unsubscribe);
    const settings = changedSettings(); await saveSettings(settings, { confirm: true });
    request.resolve({ data: { id: 'app', data: old }, error: null }); await Promise.resolve(); await Promise.resolve();
    expect(getSettings().defaultLabelLayoutIds).toEqual(settings.defaultLabelLayoutIds);
    expect(observer.mock.calls.at(-1)?.[0].defaultLabelLayoutIds).toEqual(settings.defaultLabelLayoutIds); expect(observer).toHaveBeenCalledTimes(2);
    const late = deferred<Response>(); transport.read.mockReturnValueOnce(late.promise);
    const stop = subscribeToSettings(observer); stop(); late.resolve({ data: { id: 'app', data: old }, error: null }); await Promise.resolve(); await Promise.resolve();
    expect(getSettings().defaultLabelLayoutIds).toEqual(settings.defaultLabelLayoutIds);
  });

  it('confirma nuvem mesmo quando cache falha e devolve a limitação explicitamente', async () => {
    const settings = changedSettings(); vi.spyOn(localStorage, 'setItem').mockImplementation(() => { throw new Error('Quota'); });
    expect(await saveSettings(settings, { confirm: true })).toEqual({ confirmed: true, cached: false });
  });

  it('executa RHF antes do padrão e conserva trava, ID parseado, categoria e confirmação', async () => {
    const request = deferred<Response>(); transport.write.mockReturnValueOnce(request.promise);
    const { result } = renderHook(() => useLabelLayouts({ selectedCategory: 'identificacao' }));
    await act(async () => { expect(await result.current.toggleDefaultLayout('ident_2x5', 'inválida')).toBe(false); });
    expect(transport.write).not.toHaveBeenCalled(); let pending!: Promise<boolean>;
    act(() => { pending = result.current.toggleDefaultLayout(' ident_2x5 ', 'identificacao'); });
    await waitFor(() => expect(transport.write).toHaveBeenCalledTimes(1)); expect(result.current.layoutsBusy).toBe(true);
    expect(getSettings().defaultLabelLayoutIds).not.toEqual({ identificacao_rect: 'ident_2x5' });
    await act(async () => { expect(await result.current.handleDuplicateLayout(DEFAULT_LAYOUT_MODELS[0])).toBe(false); });
    const row = transport.write.mock.calls[0][0]; expect(row.data.defaultLabelLayoutIds).toMatchObject({ identificacao_rect: 'ident_2x5' });
    await act(async () => { request.resolve(ack(row)); expect(await pending).toBe(true); });
    expect(getSettings().defaultLabelLayoutIds).toMatchObject({ identificacao_rect: 'ident_2x5' }); expect(result.current.layoutsBusy).toBe(false);
  });

  it('resultado incerto do padrão após trocar categoria bloqueia repetição com orientação', async () => {
    const request = deferred<Response>(); transport.write.mockReturnValueOnce(request.promise);
    const { result, rerender } = renderHook(({ category }) => useLabelLayouts({ selectedCategory: category }), { initialProps: { category: 'identificacao' as CategoryType } });
    let pending!: Promise<boolean>; act(() => { pending = result.current.toggleDefaultLayout('ident_2x5', 'identificacao'); });
    await waitFor(() => expect(transport.write).toHaveBeenCalledTimes(1)); rerender({ category: 'logos' });
    await act(async () => { request.resolve({ data: null, error: { code: '08006' } }); expect(await pending).toBe(false); });
    expect(result.current.layoutsBlocked).toBe(true); expect(result.current.layoutsError).toContain('Recarregue');
    await act(async () => { expect(await result.current.toggleDefaultLayout('ident_2x5', 'identificacao')).toBe(false); }); expect(transport.write).toHaveBeenCalledTimes(1);
  });

  it('preserva padrões já confirmados em memória quando duas categorias são gravadas sem cache', async () => {
    const { result, rerender } = renderHook(({ category }) => useLabelLayouts({ selectedCategory: category }), { initialProps: { category: 'identificacao' as CategoryType } });
    await waitFor(() => expect(result.current.layoutsLoading).toBe(false));
    vi.spyOn(localStorage, 'setItem').mockImplementation(() => { throw new Error('Quota'); });
    await act(async () => { expect(await result.current.toggleDefaultLayout('ident_2x5', 'identificacao')).toBe(true); });
    rerender({ category: 'logos' });
    const logo = DEFAULT_LAYOUT_MODELS.find((model) => model.category === 'logos')!;
    await act(async () => { expect(await result.current.toggleDefaultLayout(logo.id, 'logos')).toBe(true); });
    expect(transport.write).toHaveBeenCalledTimes(2);
    expect(transport.write.mock.calls[1][0].data.defaultLabelLayoutIds).toMatchObject({ identificacao_rect: 'ident_2x5', [`logos_${logo.type || 'rect'}`]: logo.id });
  });

  it('exige recarga após confirmação de padrão em outro contexto antes de enviar novo snapshot', async () => {
    const request = deferred<Response>(); transport.write.mockReturnValueOnce(request.promise);
    const { result, rerender } = renderHook(({ category }) => useLabelLayouts({ selectedCategory: category }), { initialProps: { category: 'identificacao' as CategoryType } });
    let pending!: Promise<boolean>; act(() => { pending = result.current.toggleDefaultLayout('ident_2x5', 'identificacao'); });
    await waitFor(() => expect(transport.write).toHaveBeenCalledTimes(1)); rerender({ category: 'logos' });
    await act(async () => { request.resolve(ack(transport.write.mock.calls[0][0])); expect(await pending).toBe(false); });
    expect(result.current.layoutsBlocked).toBe(true); expect(result.current.layoutsError).toContain('confirmado em outro contexto');
    const logo = DEFAULT_LAYOUT_MODELS.find((model) => model.category === 'logos')!;
    await act(async () => { expect(await result.current.toggleDefaultLayout(logo.id, 'logos')).toBe(false); });
    expect(transport.write).toHaveBeenCalledTimes(1);
  });

  it('monta com leitura local indisponível e mostra erro da preferência em vez de derrubar a página', async () => {
    vi.spyOn(localStorage, 'getItem').mockImplementation(() => { throw new DOMException('Indisponível', 'SecurityError'); });
    const { result } = renderHook(() => useLabelLayouts({ selectedCategory: 'identificacao' }));
    await waitFor(() => expect(result.current.layoutPreferenceError).toContain('seleção'));
    expect(result.current.layoutsLoading).toBe(false); expect(result.current.layoutModels.length).toBeGreaterThan(0);
  });

  it('valida preferência local antes do Storage e não grava ID vazio', async () => {
    const { result } = renderHook(() => useLabelLayouts({ selectedCategory: 'identificacao' }));
    await waitFor(() => expect(result.current.layoutsLoading).toBe(false)); const write = vi.spyOn(localStorage, 'setItem');
    act(() => { result.current.selectLayout({ ...DEFAULT_LAYOUT_MODELS[0], id: '   ' }); });
    await waitFor(() => expect(result.current.layoutPreferenceError).toContain('seleção'));
    expect(write.mock.calls.filter(([key]) => key.startsWith('lastSelected'))).toEqual([]);
  });
});
