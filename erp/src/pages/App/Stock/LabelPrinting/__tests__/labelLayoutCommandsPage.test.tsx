// @vitest-environment happy-dom
// @vitest-environment-options {"settings":{"disableCSSFileLoading":true,"disableJavaScriptFileLoading":true,"handleDisabledFileLoadingAsSuccess":true}}
import React from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { supabase } from '@/pages/utils/supabaseConfig';
import { useLabelPrintingState } from '../hooks/useLabelPrintingState';
import { ModalsSection } from '../sections/ModalsSection';
import { mapModelToDb } from '../services/labelLayoutMapper';
import type { GridModel } from '../types/LabelGridModelTypes';
import { DEFAULT_LAYOUT_MODELS } from '../utils/LabelConstants';

vi.mock('@/pages/utils/supabaseConfig', () => ({ supabase: { from: vi.fn() } }));
vi.mock('react-toastify', () => ({ toast: { success: vi.fn(), info: vi.fn(), error: vi.fn(), warning: vi.fn() } }));
vi.mock('../../../../utils/settingsService', () => ({
  getSettings: () => ({}), saveSettings: vi.fn().mockResolvedValue(undefined), subscribeToSettings: () => () => undefined,
}));
vi.mock('../services/priceLabelTemplateSync', () => ({
  subscribeToPriceLabelTemplateUpdates: () => () => undefined, publishPriceLabelTemplateUpdate: vi.fn(),
}));
vi.mock('../hooks/useLabelProducts', () => ({ useLabelProducts: () => ({ products: [], selectedProductToAdd: null }) }));
vi.mock('../hooks/useLabelQueue', () => ({ useLabelQueue: () => ({ setLogoItems: vi.fn(), setLabelItems: vi.fn() }) }));
vi.mock('../hooks/useLabelPreview', () => ({ useLabelPreview: () => ({}) }));
vi.mock('../modals/LabelAssetLibraryModal', () => ({ default: () => null }));
vi.mock('../modals/LabelCustomDesignModal', () => ({ default: () => null }));
vi.mock('../modals/LabelGridModelModal', () => ({ default: () => null }));
vi.mock('../modals/LabelImageModal', () => ({ default: () => null }));
vi.mock('../modals/LabelNewAssetModal', () => ({ default: () => null }));
vi.mock('../modals/PriceLabelArtEditorModal', () => ({ default: () => null }));

type LayoutPayload = ReturnType<typeof mapModelToDb>;
type Response = { data: unknown; error: unknown; status?: number };
const firstId = '00000000-0000-4000-8000-000000000001';
const secondId = '00000000-0000-4000-8000-000000000002';
const copyId = '00000000-0000-4000-8000-000000000003';
const first: GridModel = { ...DEFAULT_LAYOUT_MODELS[0], id: firstId, name: 'MODELO A', category: 'identificacao',
  nameFontSize: 0, imageScale: 0, nameBold: false, namePosX: 1.25,
  artConfig: { globalSnapshot: { metadata: { zero: 0, enabled: false, nullable: null } } },
};
const second: GridModel = { ...first, id: secondId, name: 'MODELO B' };
const copySource: GridModel = { ...first, name: '  Cópia parseada  ' };
const transport = {
  load: vi.fn<() => Promise<Response>>(),
  insert: vi.fn<(payload: LayoutPayload) => Promise<Response>>(),
  remove: vi.fn<(id: string) => Promise<Response>>(),
};
const insertAck = (payload: LayoutPayload): Response => ({ data: { ...payload, id: copyId }, error: null, status: 201 });
const deleteAck = (id: string): Response => ({ data: [{ id }], error: null, status: 200 });
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((finish) => { resolve = finish; });
  return { promise, resolve };
}

function PageHarness({ source = copySource }: { source?: GridModel }) {
  const state = useLabelPrintingState();
  return <>
    <button onClick={() => { state.setModelToCopy(source); state.setIsCopyModalOpen(true); }}>Abrir cópia</button>
    <button onClick={() => state.setModelToDelete(`  ${firstId}  `)}>Excluir A</button>
    <button onClick={() => state.setModelToDelete(secondId)}>Excluir B</button>
    <button onClick={() => state.setIsModelManagerModalOpen(true)}>Abrir gerenciador</button>
    <button onClick={() => { state.setIsCopyModalOpen(false); state.setModelToDelete(null); }}>Fechar externamente</button>
    <span aria-label="Modelos locais">{JSON.stringify(state.customLayouts)}</span>
    <span aria-label="Exclusão atual">{state.modelToDelete}</span>
    <ModalsSection {...state} />
  </>;
}
const layouts = (): GridModel[] => JSON.parse(screen.getByLabelText('Modelos locais').textContent || '[]');
const storedLayouts = (): GridModel[] => JSON.parse(window.localStorage.getItem('custom_label_layouts') || '[]');
async function openPage(source = copySource) {
  render(<MemoryRouter initialEntries={['/stock/labels?cat=identificacao']} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><PageHarness source={source} /></MemoryRouter>);
  await waitFor(() => expect(layouts().map((model) => model.id)).toEqual([firstId, secondId]));
}

beforeEach(() => {
  vi.clearAllMocks(); window.localStorage.clear();
  vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  transport.load.mockResolvedValue({ data: [first, second].map((model) => ({ ...mapModelToDb(model), id: model.id })), error: null, status: 200 });
  transport.insert.mockImplementation(async (payload) => insertAck(payload));
  transport.remove.mockImplementation(async (id) => deleteAck(id));
  vi.mocked(supabase.from).mockImplementation((table) => {
    if (table !== 'label_layouts') throw new Error(`Transporte inesperado: ${table}`);
    let payload: LayoutPayload | undefined, id = '', deleting = false;
    const query = {
      insert: (values: LayoutPayload[]) => { payload = values[0]; return query; },
      delete: () => { deleting = true; return query; },
      eq: (_field: string, value: string) => { id = value; return query; },
      select: () => deleting ? transport.remove(id) : payload ? query : transport.load(),
      single: () => transport.insert(payload!),
    };
    return query as never;
  });
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe('comandos de modelos pela fachada e seção reais', () => {
  it('aguarda cópia confirmada, preserva valores parseados e bloqueia duplicação/fechamento', async () => {
    const pending = deferred<Response>(); transport.insert.mockReturnValueOnce(pending.promise);
    await openPage(); fireEvent.click(screen.getByText('Abrir cópia'));
    const dialog = screen.getByRole('dialog'), submit = within(dialog).getByRole('button', { name: 'Preços de Venda' }) as HTMLButtonElement;
    fireEvent.click(submit); fireEvent.click(submit);
    await waitFor(() => expect(transport.insert).toHaveBeenCalledTimes(1));
    expect(submit.disabled).toBe(true); expect(screen.getByRole('status').textContent).toContain('Copiando');
    fireEvent.keyDown(dialog, { key: 'Escape' }); fireEvent.click(screen.getByLabelText('Fechar modal de cópia'));
    fireEvent.click(within(dialog).getByText('Cancelar')); expect(dialog.isConnected).toBe(true);
    expect(layouts()).toHaveLength(2);
    const payload = transport.insert.mock.calls[0][0];
    expect(payload).toMatchObject({ name: 'Cópia parseada', category: 'precos', name_font_size: 0, safety_margin: 0, name_bold: false, name_pos_x: 1.25, art_config: first.artConfig });
    await act(async () => { pending.resolve(insertAck(payload)); });
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(layouts().find((model) => model.id === copyId)).toMatchObject({ name: 'Cópia parseada', category: 'precos', nameFontSize: 0, imageScale: 0, artConfig: first.artConfig });
    expect(storedLayouts().map((model) => model.id)).toEqual([firstId, secondId, copyId]);
  });

  it('executa o resolver real e mantém a cópia aberta para fonte inválida sem chegar ao transporte', async () => {
    await openPage({ ...copySource, name: '   ' }); fireEvent.click(screen.getByText('Abrir cópia'));
    fireEvent.click(screen.getByText('Preços de Venda'));
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('Informe o nome'));
    expect(transport.insert).not.toHaveBeenCalled(); expect(screen.getByRole('dialog')).toBeTruthy(); expect(layouts()).toHaveLength(2);
  });

  it('não fecha nem publica cópia quando a confirmação remota diverge do payload', async () => {
    transport.insert.mockImplementationOnce(async (payload) => ({ data: { ...payload, id: copyId, category: 'posts' }, error: null, status: 201 }));
    await openPage(); fireEvent.click(screen.getByText('Abrir cópia')); fireEvent.click(screen.getByText('Preços de Venda'));
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('não foi confirmada'));
    expect(screen.getByRole('dialog')).toBeTruthy(); expect(layouts()).toHaveLength(2); expect(storedLayouts()).toHaveLength(2);
    expect((screen.getByRole('button', { name: 'Preços de Venda' }) as HTMLButtonElement).disabled).toBe(true);
    expect(transport.insert).toHaveBeenCalledTimes(1);
  });

  it('valida o ID, aguarda exclusão confirmada e protege Escape/cancelar/clique duplicado', async () => {
    const pending = deferred<Response>(); transport.remove.mockReturnValueOnce(pending.promise);
    await openPage(); fireEvent.click(screen.getByText('Excluir A'));
    const dialog = screen.getByRole('dialog'), submit = within(dialog).getByText('Sim, Excluir') as HTMLButtonElement;
    fireEvent.click(submit); fireEvent.click(submit);
    await waitFor(() => expect(transport.remove).toHaveBeenCalledTimes(1));
    expect(transport.remove).toHaveBeenCalledWith(firstId); expect(submit.disabled).toBe(true);
    expect(screen.getByRole('status').textContent).toContain('Excluindo');
    fireEvent.keyDown(dialog, { key: 'Escape' }); fireEvent.click(screen.getByLabelText('Cancelar exclusão'));
    fireEvent.click(within(dialog).getByText('Cancelar')); expect(dialog.isConnected).toBe(true); expect(layouts()).toHaveLength(2);
    await act(async () => { pending.resolve(deleteAck(firstId)); });
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(layouts().map((model) => model.id)).toEqual([secondId]); expect(storedLayouts().map((model) => model.id)).toEqual([secondId]);
  });

  it('mantém diálogo e lista após rejeição de exclusão e permite uma tentativa confirmada', async () => {
    transport.remove.mockResolvedValueOnce({ data: null, error: { code: '42501', message: 'Sem permissão.' }, status: 403 });
    await openPage(); fireEvent.click(screen.getByText('Excluir A')); fireEvent.click(screen.getByText('Sim, Excluir'));
    await waitFor(() => expect(screen.getByRole('alert')).toBeTruthy());
    expect(screen.getByRole('dialog')).toBeTruthy(); expect(layouts()).toHaveLength(2); expect(storedLayouts()).toHaveLength(2);
    expect((screen.getByText('Sim, Excluir') as HTMLButtonElement).disabled).toBe(false);
    fireEvent.click(screen.getByText('Sim, Excluir'));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(transport.remove).toHaveBeenCalledTimes(2); expect(layouts().map((model) => model.id)).toEqual([secondId]);
  });

  it('usa o proprietário real no gerenciador e só remove a linha depois da confirmação', async () => {
    const confirmation = vi.spyOn(window, 'confirm').mockReturnValue(true);
    const pending = deferred<Response>(); transport.remove.mockReturnValueOnce(pending.promise);
    await openPage(); fireEvent.click(screen.getByText('Abrir gerenciador'));
    const dialog = screen.getByRole('dialog'), submit = within(dialog).getAllByTitle('Excluir Modelo')[0] as HTMLButtonElement;
    fireEvent.click(submit); fireEvent.click(submit);
    await waitFor(() => expect(transport.remove).toHaveBeenCalledWith(firstId));
    expect(confirmation).toHaveBeenCalledTimes(1); expect(submit.disabled).toBe(true); expect(screen.getByRole('status').textContent).toContain('Atualizando');
    fireEvent.keyDown(dialog, { key: 'Escape' }); fireEvent.click(screen.getByLabelText('Fechar gerenciador de modelos'));
    expect(dialog.isConnected).toBe(true); expect(within(dialog).getByText(first.name)).toBeTruthy();
    await act(async () => { pending.resolve(deleteAck(firstId)); });
    await waitFor(() => expect(within(dialog).queryByText(first.name)).toBeNull());
    expect(within(dialog).getByText(second.name)).toBeTruthy(); expect(layouts().map((model) => model.id)).toEqual([secondId]);
    expect(screen.getByRole('dialog')).toBe(dialog); expect(transport.remove).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByLabelText('Fechar gerenciador de modelos')); expect(screen.queryByRole('dialog')).toBeNull();
  });

  it.each(['cópia', 'exclusão'])('resposta antiga de %s não fecha uma nova abertura', async (kind) => {
    const pending = deferred<Response>();
    if (kind === 'cópia') transport.insert.mockReturnValueOnce(pending.promise);
    else transport.remove.mockReturnValueOnce(pending.promise);
    await openPage(); fireEvent.click(screen.getByText(kind === 'cópia' ? 'Abrir cópia' : 'Excluir A'));
    fireEvent.click(screen.getByText(kind === 'cópia' ? 'Preços de Venda' : 'Sim, Excluir'));
    await waitFor(() => expect(kind === 'cópia' ? transport.insert : transport.remove).toHaveBeenCalledTimes(1));
    fireEvent.click(screen.getByText('Fechar externamente'));
    expect(screen.queryByRole('dialog')).toBeNull();
    fireEvent.click(screen.getByText(kind === 'cópia' ? 'Abrir cópia' : 'Excluir B'));
    const nextDialog = screen.getByRole('dialog');
    await act(async () => { pending.resolve(kind === 'cópia' ? insertAck(transport.insert.mock.calls[0][0]) : deleteAck(firstId)); });
    await waitFor(() => expect(screen.queryByRole('status')).toBeNull());
    expect(screen.getByRole('dialog')).toBe(nextDialog);
    if (kind === 'exclusão') expect(screen.getByLabelText('Exclusão atual').textContent).toBe(secondId);
    expect((screen.getByRole('button', { name: kind === 'cópia' ? 'Preços de Venda' : 'Sim, Excluir' }) as HTMLButtonElement).disabled).toBe(false);
  });
});
