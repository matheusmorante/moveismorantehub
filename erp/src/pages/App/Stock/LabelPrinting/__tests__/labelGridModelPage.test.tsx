// @vitest-environment happy-dom
// @vitest-environment-options {"settings":{"disableCSSFileLoading":true,"disableJavaScriptFileLoading":true,"handleDisabledFileLoadingAsSuccess":true}}
import React from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
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
vi.mock('../../../../utils/settingsService', () => ({ getSettings: () => ({}), saveSettings: vi.fn(), subscribeToSettings: () => () => undefined }));
vi.mock('../services/priceLabelTemplateSync', () => ({ subscribeToPriceLabelTemplateUpdates: () => () => undefined, publishPriceLabelTemplateUpdate: vi.fn() }));
vi.mock('../hooks/useLabelProducts', () => ({ useLabelProducts: () => ({ products: [], selectedProductToAdd: null }) }));
vi.mock('../hooks/useLabelQueue', () => ({ useLabelQueue: () => ({ setLogoItems: vi.fn(), setLabelItems: vi.fn() }) }));
vi.mock('../hooks/useLabelPreview', () => ({ useLabelPreview: () => ({}) }));
vi.mock('../modals/LabelAssetLibraryModal', () => ({ default: () => null }));
vi.mock('../modals/LabelCustomDesignModal', () => ({ default: () => null }));
vi.mock('../modals/LabelImageModal', () => ({ default: () => null }));
vi.mock('../modals/LabelNewAssetModal', () => ({ default: () => null }));
vi.mock('../modals/PriceLabelArtEditorModal', () => ({ default: () => null }));

type Payload = ReturnType<typeof mapModelToDb>;
type Response = { data: unknown; error: unknown; status?: number };
const id = '00000000-0000-4000-8000-000000000001', createdId = '00000000-0000-4000-8000-000000000002';
const source: GridModel = { ...DEFAULT_LAYOUT_MODELS[0], id, name: 'ORIGINAL', category: 'identificacao',
  nameFontSize: 0, priceFontSize: 0, promoNameFontSize: 0, priceFontSizeTens: 0, priceFontSizeHundreds: 0,
  priceFontSizeThousands: 0, priceFontSizeTenThousands: 0, priceSymbolFontSize: 0, priceDecimalsFontSize: 0,
  promoPriceSymbolFontSize: 0, promoPriceDecimalsFontSize: 0, imageScale: 0, nameHeight: 0, priceWidth: 0,
  promoNameWidth: 0, promoNameHeight: 0, oldPriceWidth: 0, oldPriceFontSize: 0, nameBold: false,
  artConfig: { globalSnapshot: { title: 'ARTE', scaleTens: 0, metadata: { enabled: false, empty: null } } },
};
const transport = {
  query: vi.fn<() => Promise<Response>>(),
  write: vi.fn<(payload: Payload, target: string) => Promise<Response>>(),
};
const ack = (payload: Payload, target: string): Response => ({ data: { ...payload, id: target || createdId }, error: null, status: 200 });
function deferred<T>() { let resolve!: (value: T) => void; const promise = new Promise<T>((done) => { resolve = done; }); return { promise, resolve }; }
function Page() {
  const state = useLabelPrintingState();
  return <>
    <button onClick={() => { state.setEditingGridModel(null); state.setGridModalOpen(true); }}>Novo modelo</button>
    <button onClick={() => { const current = state.customLayouts.find((model) => model.id === id)!; state.selectLayout(current); state.setEditingGridModel(current); state.setGridModalOpen(true); }}>Editar original</button>
    <button onClick={() => { state.setGridModalOpen(false); state.setEditingGridModel(null); }}>Fechar externamente</button>
    <button onClick={() => state.setSelectedCategory('logos')}>Trocar categoria</button>
    <span aria-label="Modelos">{JSON.stringify(state.customLayouts)}</span>
    <span aria-label="Modelo ativo">{state.config.layoutId}</span>
    <ModalsSection {...state} />
  </>;
}
const models = (): GridModel[] => JSON.parse(screen.getByLabelText('Modelos').textContent || '[]');
const stored = (): GridModel[] => JSON.parse(window.localStorage.getItem('custom_label_layouts') || '[]');
async function open(edit = true, expectedCount = 1) {
  const view = render(<MemoryRouter initialEntries={['/stock/labels?cat=identificacao']} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><Page /></MemoryRouter>);
  await waitFor(() => expect(models()).toHaveLength(expectedCount));
  fireEvent.click(screen.getByText(edit ? 'Editar original' : 'Novo modelo'));
  return view;
}
beforeEach(() => {
  vi.clearAllMocks(); window.localStorage.clear(); vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  transport.query.mockReset().mockResolvedValue({ data: [{ ...mapModelToDb(source), id }], error: null });
  transport.write.mockReset().mockImplementation(async (payload, target) => ack(payload, target));
  vi.mocked(supabase.from).mockImplementation((table) => {
    if (table !== 'label_layouts') throw new Error(`Transporte inesperado: ${table}`);
    let payload: Payload | undefined, target = '';
    const query = {
      update: (value: Payload) => { payload = value; return query; },
      insert: (values: Payload[]) => { payload = values[0]; return query; },
      eq: (_field: string, value: string) => { target = value; return query; },
      select: () => payload ? query : transport.query(),
      single: () => transport.write(payload!, target),
    };
    return query as never;
  });
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe('salvar modelo pela página, editor, resolver e serviço reais', () => {
  it('valida a fonte editada no filho de design sem truncar fração nem aceitar tamanho negativo', async () => {
    await open(); fireEvent.click(screen.getByRole('button', { name: /Editar Design Visual/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Produto' }));
    fireEvent.change(screen.getByLabelText('Tamanho da fonte selecionada'), { target: { value: '-1' } });
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar Design' })); fireEvent.click(screen.getByText('Salvar Modelo'));
    await waitFor(() => expect(screen.getByRole('alert')).toBeTruthy()); expect(transport.write).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: /Editar Design Visual/ }));
    fireEvent.change(screen.getByLabelText('Tamanho da fonte selecionada'), { target: { value: '6.25' } });
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar Design' })); fireEvent.click(screen.getByText('Salvar Modelo'));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(transport.write.mock.calls[0][0]).toMatchObject({ promo_name_font_size: 6.25, name_font_size: 0 });
  });
  it('mantém medidas fracionárias de papel personalizado ao reabrir e salvar', async () => {
    transport.query.mockResolvedValueOnce({ data: [{ ...mapModelToDb({ ...source, paperSize: 'Custom', paperWidth: 100.5, paperHeight: 200.25 }), id }], error: null });
    await open();
    expect((screen.getByLabelText('Largura do papel personalizado') as HTMLInputElement).value).toBe('100.5');
    expect((screen.getByLabelText('Altura do papel personalizado') as HTMLInputElement).value).toBe('200.25');
    fireEvent.click(screen.getByText('Salvar Modelo'));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(transport.write.mock.calls[0][0]).toMatchObject({ paper_size: 'Custom', paper_width: 100.5, paper_height: 200.25 });
  });
  it('congela campos e espera confirmação, preservando zeros e arte do modelo', async () => {
    const request = deferred<Response>(); transport.write.mockReturnValueOnce(request.promise); await open();
    fireEvent.change(screen.getByLabelText('Nome do modelo'), { target: { value: '  Editado  ' } });
    fireEvent.click(screen.getByText('Salvar Modelo')); fireEvent.click(screen.getByText('Salvando...'));
    await waitFor(() => expect(transport.write).toHaveBeenCalledTimes(1));
    const fieldset = screen.getByLabelText('Nome do modelo').closest('fieldset')!;
    expect(fieldset.disabled).toBe(true); expect((screen.getByLabelText('Carregar amostra de etiqueta') as HTMLInputElement).disabled).toBe(true);
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' }); fireEvent.click(screen.getByLabelText('Fechar editor de grade de etiqueta'));
    expect(screen.getByRole('dialog')).toBeTruthy(); expect(models()[0].name).toBe('ORIGINAL');
    const [payload, target] = transport.write.mock.calls[0]; expect(target).toBe(id);
    expect(payload).toMatchObject({ name: 'Editado', name_font_size: 0, price_font_size: 0, price_font_size_tens: 0, price_font_size_hundreds: 0, price_font_size_thousands: 0, price_font_size_ten_thousands: 0, price_symbol_font_size: 0, price_decimals_font_size: 0, promo_name_font_size: 0, promo_price_symbol_font_size: 0, promo_price_decimals_font_size: 0, safety_margin: 0, name_height: 0, price_width: 0, promo_name_width: 0, old_price_width: 0, old_price_font_size: 0, name_bold: false, art_config: source.artConfig });
    await act(async () => { request.resolve(ack(payload, target)); });
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(models()[0].name).toBe('Editado'); expect(stored()[0].artConfig).toEqual(source.artConfig);
    expect(screen.getByLabelText('Modelo ativo').textContent).toBe(id);
  });

  it.each(['0', '1.5'])('não arredonda nem substitui linhas inválidas %s antes do resolver', async (value) => {
    await open(); fireEvent.change(screen.getByLabelText('Linhas da grade'), { target: { value } });
    fireEvent.click(screen.getByText('Salvar Modelo'));
    await waitFor(() => expect(screen.getByRole('alert')).toBeTruthy());
    expect(transport.write).not.toHaveBeenCalled(); expect(models()[0].rows).toBe(source.rows);
    expect(screen.getByRole('dialog')).toBeTruthy(); expect((screen.getByLabelText('Linhas da grade') as HTMLInputElement).value).toBe(value);
  });

  it('exige dimensões do papel personalizado no resolver sem invalidar o rascunho de edição', async () => {
    await open(false); fireEvent.change(screen.getByLabelText('Papel do modelo'), { target: { value: 'Custom' } });
    fireEvent.change(screen.getByLabelText('Largura do papel personalizado'), { target: { value: '0' } });
    fireEvent.click(screen.getByText('Salvar Modelo'));
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('dimensão positiva'));
    expect(transport.write).not.toHaveBeenCalled(); expect(screen.getByRole('dialog')).toBeTruthy();
  });

  it('mostra falha de Storage sem fechar/publicar e permite correção', async () => {
    transport.write.mockResolvedValueOnce({ data: null, error: { code: '42501', message: 'Rejeitado' }, status: 403 });
    await open(); const setItem = vi.spyOn(window.localStorage, 'setItem').mockImplementation(() => { throw new Error('Quota local'); });
    fireEvent.change(screen.getByLabelText('Nome do modelo'), { target: { value: 'Edição' } }); fireEvent.click(screen.getByText('Salvar Modelo'));
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('neste computador'));
    expect(models()[0].name).toBe('ORIGINAL'); expect(screen.getByRole('dialog')).toBeTruthy();
    expect(screen.getByLabelText('Nome do modelo').closest('fieldset')!.disabled).toBe(false);
    setItem.mockRestore(); fireEvent.click(screen.getByText('Salvar Modelo'));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull()); expect(models()[0].name).toBe('Edição');
  });

  it('preserva fallback de edição remota e seu vínculo ao recarregar', async () => {
    transport.write.mockResolvedValueOnce({ data: null, error: { code: '42501', message: 'Rejeitado' }, status: 403 });
    const view = await open(); fireEvent.change(screen.getByLabelText('Nome do modelo'), { target: { value: 'EDIÇÃO LOCAL' } }); fireEvent.click(screen.getByText('Salvar Modelo'));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    const fallback = models().find((model) => model.id.startsWith('custom_'))!;
    expect(fallback).toMatchObject({ name: 'EDIÇÃO LOCAL', baseModelId: id }); expect(models()).toHaveLength(2);
    view.unmount(); await open(false, 2);
    await waitFor(() => expect(models().find((model) => model.id === fallback.id)?.name).toBe('EDIÇÃO LOCAL'));
    expect(stored().map((model) => model.id)).toEqual([id, fallback.id]); expect(transport.write).toHaveBeenCalledTimes(1);
  });

  it('mantém editor e lista quando o ACK diverge e bloqueia também uma nova abertura', async () => {
    transport.write.mockImplementationOnce(async (payload, target) => ({ data: { ...payload, id: target, rows: 999 }, error: null }));
    await open(); fireEvent.click(screen.getByText('Salvar Modelo'));
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('não foi confirmada'));
    expect(models()[0].rows).toBe(source.rows); expect((screen.getByText('Salvar Modelo') as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(screen.getByLabelText('Fechar editor de grade de etiqueta')); fireEvent.click(screen.getByText('Editar original'));
    expect((screen.getByText('Salvar Modelo') as HTMLButtonElement).disabled).toBe(true); expect(screen.getByRole('alert').textContent).toContain('Recarregue');
    expect(transport.write).toHaveBeenCalledTimes(1);
  });

  it('não publica nem fecha nova abertura após confirmação antiga', async () => {
    const request = deferred<Response>(); transport.write.mockReturnValueOnce(request.promise); await open();
    fireEvent.click(screen.getByText('Salvar Modelo')); await waitFor(() => expect(transport.write).toHaveBeenCalled());
    fireEvent.click(screen.getByText('Fechar externamente')); fireEvent.click(screen.getByText('Novo modelo')); const nextDialog = screen.getByRole('dialog');
    await act(async () => { request.resolve(ack(...transport.write.mock.calls[0])); });
    await waitFor(() => expect(screen.queryByRole('status')).toBeNull());
    expect(screen.getByRole('dialog')).toBe(nextDialog); expect(models()[0].name).toBe('ORIGINAL');
  });

  it('mantém resultado incerto de outra categoria bloqueado no editor atual', async () => {
    const request = deferred<Response>(); transport.write.mockReturnValueOnce(request.promise); await open();
    fireEvent.click(screen.getByText('Salvar Modelo')); await waitFor(() => expect(transport.write).toHaveBeenCalled());
    fireEvent.click(screen.getByText('Trocar categoria')); const nextDialog = screen.getByRole('dialog');
    await act(async () => { request.resolve({ data: null, error: { code: '08006' } }); });
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('Recarregue'));
    expect(screen.getByRole('dialog')).toBe(nextDialog); expect((screen.getByText('Salvar Modelo') as HTMLButtonElement).disabled).toBe(true);
    expect(transport.write).toHaveBeenCalledTimes(1);
  });
});
