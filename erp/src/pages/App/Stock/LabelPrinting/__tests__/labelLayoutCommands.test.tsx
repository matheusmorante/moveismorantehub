// @vitest-environment happy-dom
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { toast } from 'react-toastify';
import { LabelLayoutUnconfirmedError } from '../../../../../../../shared-utils/labelLayoutFormSchemas';
import { useLabelLayouts } from '../hooks/useLabelLayouts';
import type { CategoryType } from '../hooks/useLabelCategory';
import { deleteRemoteLabelLayout, fetchRemoteLabelLayouts, insertRemoteLabelLayout } from '../services/labelLayoutService';
import { getCustomLabelLayouts, getHiddenDefaultLayoutIds, saveCustomLabelLayouts } from '../services/labelStorageService';
import type { GridModel } from '../types/LabelGridModelTypes';
import { DEFAULT_LAYOUT_MODELS } from '../utils/LabelConstants';

vi.mock('react-toastify', () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }));
vi.mock('../services/labelLayoutService', () => ({ fetchRemoteLabelLayouts: vi.fn(), insertRemoteLabelLayout: vi.fn(), updateRemoteLabelLayout: vi.fn(), deleteRemoteLabelLayout: vi.fn() }));
vi.mock('../services/priceLabelTemplateSync', () => ({ subscribeToPriceLabelTemplateUpdates: () => () => undefined }));
vi.mock('../../../../utils/settingsService', () => ({ getSettings: () => ({}), saveSettings: vi.fn(), subscribeToSettings: () => () => undefined }));

const model: GridModel = {
  id: 'remote_original', name: 'Modelo original', category: 'identificacao', type: 'rect',
  columns: 2, rows: 5, marginT: 0, marginB: 0, marginL: 0, marginR: 0, gapH: 0, gapV: 0,
  paperSize: 'A4', icon: 'bi-square', nameFontSize: 0, priceFontSize: 0,
};
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((complete) => { resolve = complete; });
  return { promise, resolve };
}
async function owner() {
  const hook = renderHook(({ category }) => useLabelLayouts({ selectedCategory: category }), { initialProps: { category: 'identificacao' as CategoryType } });
  await waitFor(() => expect(fetchRemoteLabelLayouts).toHaveBeenCalled());
  return hook;
}
beforeEach(() => {
  vi.clearAllMocks(); window.localStorage.clear();
  vi.mocked(fetchRemoteLabelLayouts).mockReset().mockResolvedValue({ data: [], error: null });
  vi.mocked(insertRemoteLabelLayout).mockReset().mockImplementation(async (value) => ({ data: { ...value, id: 'remote_copy' }, error: null }));
  vi.mocked(deleteRemoteLabelLayout).mockReset().mockResolvedValue({ error: null });
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe('comandos de modelos com RHF, Zod, persistência e Storage reais', () => {
  it('rejeita nome, origem, destino e geometria inválidos antes de qualquer gravação', async () => {
    const { result } = await owner();
    const write = vi.spyOn(window.localStorage, 'setItem');
    await act(async () => {
      expect(await result.current.handleDuplicateLayout({ ...model, name: '   ' })).toBe(false);
      expect(await result.current.handleDuplicateLayout({ ...model, id: '' })).toBe(false);
      expect(await result.current.handleCopyToCategory(model, 'inexistente' as CategoryType)).toBe(false);
      expect(await result.current.handleCopyToCategory({ ...model, type: 'round' }, 'precos')).toBe(false);
      expect(await result.current.handleDuplicateLayout({ ...model, rows: 1.5 })).toBe(false);
      expect(await result.current.handleDeleteLayout('  ')).toBe(false);
    });
    expect(insertRemoteLabelLayout).not.toHaveBeenCalled(); expect(deleteRemoteLabelLayout).not.toHaveBeenCalled();
    expect(write).not.toHaveBeenCalled(); expect(result.current.layoutsError).not.toBe('');
  });

  it('copia o snapshot parseado sem substituir a origem nem seu override', async () => {
    const source = { ...model, baseModelId: 'ident_2x5', name: '  Original  ', paperWidth: 100.5, artConfig: { globalSnapshot: { scaleTens: 0, title: 'Arte' } } };
    saveCustomLabelLayouts([source]); vi.mocked(fetchRemoteLabelLayouts).mockResolvedValue({ data: [source], error: null });
    const { result } = await owner();
    await act(async () => { expect(await result.current.handleCopyToCategory(source, 'precos')).toBe(true); });
    expect(insertRemoteLabelLayout).toHaveBeenCalledWith(expect.objectContaining({ id: '', name: 'Original', category: 'precos', baseModelId: undefined, nameFontSize: 0, paperWidth: 100.5, artConfig: source.artConfig }));
    expect(result.current.customLayouts.map((item) => item.id)).toEqual(['remote_original', 'remote_copy']);
    expect(getCustomLabelLayouts()?.find((item) => item.id === 'remote_original')).toEqual(source);
  });

  it('mantém a trava compartilhada e a lista até a confirmação remota', async () => {
    const remote = deferred<Awaited<ReturnType<typeof insertRemoteLabelLayout>>>();
    vi.mocked(insertRemoteLabelLayout).mockReturnValue(remote.promise);
    const { result } = await owner(); let copy!: Promise<boolean>;
    act(() => { copy = result.current.handleCopyToCategory(model, 'precos'); });
    await waitFor(() => expect(insertRemoteLabelLayout).toHaveBeenCalledTimes(1));
    expect(result.current.layoutsBusy).toBe(true); expect(result.current.customLayouts).toEqual([]);
    await act(async () => {
      expect(await result.current.handleDuplicateLayout(model)).toBe(false);
      expect(await result.current.handleDeleteLayout(DEFAULT_LAYOUT_MODELS[0].id)).toBe(false);
    });
    expect(deleteRemoteLabelLayout).not.toHaveBeenCalled(); expect(getHiddenDefaultLayoutIds()).toEqual([]);
    await act(async () => { remote.resolve({ data: { ...model, id: 'remote_copy', category: 'precos' }, error: null }); expect(await copy).toBe(true); });
    expect(result.current.layoutsBusy).toBe(false); expect(result.current.customLayouts).toHaveLength(1);
  });

  it('não remove nem troca o modelo ativo quando o DELETE é rejeitado', async () => {
    vi.mocked(fetchRemoteLabelLayouts).mockResolvedValue({ data: [model], error: null });
    const { result } = await owner(); act(() => { result.current.selectLayout(model); });
    const remote = deferred<Awaited<ReturnType<typeof deleteRemoteLabelLayout>>>();
    vi.mocked(deleteRemoteLabelLayout).mockReturnValueOnce(remote.promise); let deletion!: Promise<boolean>;
    act(() => { deletion = result.current.handleDeleteLayout(' remote_original '); });
    await waitFor(() => expect(deleteRemoteLabelLayout).toHaveBeenCalledWith('remote_original'));
    expect(result.current.customLayouts).toContainEqual(model); expect(result.current.config.layoutId).toBe(model.id);
    await act(async () => { remote.resolve({ error: new Error('Sem permissão') }); expect(await deletion).toBe(false); });
    expect(result.current.customLayouts).toContainEqual(model); expect(result.current.config.layoutId).toBe(model.id);
    expect(result.current.layoutsError).toBe('Sem permissão'); expect(result.current.layoutsBlocked).toBe(false);
    await act(async () => { expect(await result.current.handleDeleteLayout(model.id)).toBe(true); });
    expect(result.current.customLayouts).toEqual([]); expect(result.current.config.layoutId).not.toBe(model.id);
  });

  it.each(['local', 'sistema'])('mantém %s quando a gravação local não é confirmada', async (kind) => {
    const local = { ...model, id: 'custom_local' }; saveCustomLabelLayouts([local]);
    const { result } = await owner();
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    vi.spyOn(window.localStorage, 'setItem').mockImplementation(() => { throw new Error('Quota'); });
    const id = kind === 'local' ? local.id : DEFAULT_LAYOUT_MODELS[0].id;
    await act(async () => { expect(await result.current.handleDeleteLayout(id)).toBe(false); });
    expect(result.current.customLayouts).toContainEqual(local); expect(getHiddenDefaultLayoutIds()).toEqual([]);
    expect(deleteRemoteLabelLayout).not.toHaveBeenCalled(); expect(result.current.layoutsError).toContain('confirmar');
  });

  it('usa contingência somente após rejeição conhecida e confirma o Storage', async () => {
    vi.mocked(insertRemoteLabelLayout).mockResolvedValue({ data: null, error: new Error('Quota remota') });
    const { result } = await owner();
    await act(async () => { expect(await result.current.handleDuplicateLayout(model)).toBe(true); });
    const copy = result.current.customLayouts[0]; expect(copy.id).toMatch(/^custom_/); expect(getCustomLabelLayouts()).toEqual([copy]);
    expect(toast.success).toHaveBeenCalledWith('Cópia salva neste computador.');
  });

  it.each(['cópia', 'exclusão'])('preserva bloqueio e orientação quando a %s retorna incerta após troca de categoria', async (operation) => {
    vi.mocked(fetchRemoteLabelLayouts).mockResolvedValue({ data: [model], error: null });
    const insert = deferred<Awaited<ReturnType<typeof insertRemoteLabelLayout>>>();
    const remove = deferred<Awaited<ReturnType<typeof deleteRemoteLabelLayout>>>();
    vi.mocked(insertRemoteLabelLayout).mockReturnValue(insert.promise); vi.mocked(deleteRemoteLabelLayout).mockReturnValue(remove.promise);
    const { result, rerender } = await owner(); let pending!: Promise<boolean>;
    act(() => { pending = operation === 'cópia' ? result.current.handleCopyToCategory(model, 'precos') : result.current.handleDeleteLayout(model.id); });
    await waitFor(() => expect(operation === 'cópia' ? insertRemoteLabelLayout : deleteRemoteLabelLayout).toHaveBeenCalledTimes(1));
    rerender({ category: 'logos' });
    await act(async () => {
      if (operation === 'cópia') insert.resolve({ data: null, error: new LabelLayoutUnconfirmedError() });
      else remove.resolve({ error: new LabelLayoutUnconfirmedError() });
      expect(await pending).toBe(false);
    });
    expect(result.current.layoutsBlocked).toBe(true); expect(result.current.layoutsError).toContain('Recarregue');
    expect(toast.error).not.toHaveBeenCalled();
    rerender({ category: 'identificacao' }); expect(result.current.layoutsError).toContain('Recarregue');
    await act(async () => { expect(await result.current.handleDuplicateLayout(model)).toBe(false); expect(await result.current.handleDeleteLayout(model.id)).toBe(false); });
    expect(insertRemoteLabelLayout).toHaveBeenCalledTimes(operation === 'cópia' ? 1 : 0);
    expect(deleteRemoteLabelLayout).toHaveBeenCalledTimes(operation === 'exclusão' ? 1 : 0);
    expect(result.current.customLayouts).toEqual([model]);
  });

  it('descarta erro de validação e efeitos de um diálogo que perdeu o proprietário antes do resolver', async () => {
    const { result } = await owner(); let current = true; let pending!: Promise<boolean>;
    act(() => { pending = result.current.handleCopyToCategory({ ...model, name: '' }, 'precos', () => current); current = false; });
    await act(async () => { expect(await pending).toBe(false); });
    expect(result.current.layoutsError).toBe(''); expect(toast.error).not.toHaveBeenCalled(); expect(insertRemoteLabelLayout).not.toHaveBeenCalled();
  });

  it('não aplica fallback, cache ou toast de uma confirmação pertencente a diálogo encerrado', async () => {
    const remote = deferred<Awaited<ReturnType<typeof insertRemoteLabelLayout>>>(); vi.mocked(insertRemoteLabelLayout).mockReturnValue(remote.promise);
    const { result } = await owner(); let current = true; let pending!: Promise<boolean>;
    const write = vi.spyOn(window.localStorage, 'setItem');
    act(() => { pending = result.current.handleCopyToCategory(model, 'precos', () => current); });
    await waitFor(() => expect(insertRemoteLabelLayout).toHaveBeenCalled()); current = false;
    await act(async () => { remote.resolve({ data: { ...model, id: 'remote_copy' }, error: null }); expect(await pending).toBe(false); });
    expect(write).not.toHaveBeenCalled(); expect(result.current.customLayouts).toEqual([]); expect(toast.success).not.toHaveBeenCalled(); expect(result.current.layoutsError).toBe('');
  });

  it('preserva o cache inicial e não deixa a consulta atrasada sobrescrever uma cópia confirmada', async () => {
    const local = { ...model, id: 'custom_existing' }; saveCustomLabelLayouts([local]);
    const query = deferred<Awaited<ReturnType<typeof fetchRemoteLabelLayouts>>>(); vi.mocked(fetchRemoteLabelLayouts).mockReturnValue(query.promise);
    const { result } = await owner(); expect(result.current.customLayouts).toEqual([local]);
    await act(async () => { expect(await result.current.handleDuplicateLayout(model)).toBe(true); });
    await act(async () => { query.resolve({ data: [model], error: null }); });
    expect(result.current.customLayouts.map((entry) => entry.id)).toEqual(['custom_existing', 'remote_copy']);
    expect(getCustomLabelLayouts()?.map((entry) => entry.id)).toEqual(['custom_existing', 'remote_copy']);
  });

  it('não cancela a consulta inicial por uma submissão inválida', async () => {
    const query = deferred<Awaited<ReturnType<typeof fetchRemoteLabelLayouts>>>(); vi.mocked(fetchRemoteLabelLayouts).mockReturnValue(query.promise);
    const { result } = await owner();
    await act(async () => { expect(await result.current.handleDuplicateLayout({ ...model, name: '' })).toBe(false); });
    await act(async () => { query.resolve({ data: [model], error: null }); });
    expect(result.current.customLayouts).toEqual([model]);
  });

  it('não revive modelo remoto removido quando a consulta confirma lista vazia', async () => {
    const local = { ...model, id: 'custom_existing' }; saveCustomLabelLayouts([model, local]);
    const { result } = await owner();
    await waitFor(() => expect(result.current.customLayouts).toEqual([local])); expect(getCustomLabelLayouts()).toEqual([local]);
  });
});
