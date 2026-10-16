// @vitest-environment happy-dom
// @vitest-environment-options {"settings":{"disableCSSFileLoading":true,"disableJavaScriptFileLoading":true,"handleDisabledFileLoadingAsSuccess":true}}
import React, { useState } from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { supabase } from '@/pages/utils/supabaseConfig';
import { ModalsSection } from '../sections/ModalsSection';
import type { ModalsSectionProps } from '../types/LabelPrintingSections.types';
import type { LabelConfig } from '../utils/LabelConstants';
import { createInitialLabelConfig } from '../services/labelModelMapper';
import { publishPriceLabelTemplateUpdate } from '../services/priceLabelTemplateSync';
import { searchProductsForLabelResult } from '../services/priceLabelCatalogService';

vi.mock('@/pages/utils/supabaseConfig', () => ({ supabase: { from: vi.fn() } }));
vi.mock('react-toastify', () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }));
vi.mock('../services/priceLabelTemplateSync', () => ({ publishPriceLabelTemplateUpdate: vi.fn() }));
vi.mock('../services/priceLabelCatalogService', () => ({ searchProductsForLabelResult: vi.fn() }));
vi.mock('../services/priceLabelExportService', () => ({ exportLabelImage: vi.fn() }));
vi.mock('../hooks/usePriceLabelEditorKeyboardShortcuts', () => ({ usePriceLabelEditorKeyboardShortcuts: () => undefined }));
vi.mock('../hooks/usePriceLabelLayerSelection', () => ({ usePriceLabelLayerSelection: () => vi.fn() }));
vi.mock('../components/PriceLabelArtRenderer', () => ({
  PriceLabelArtRenderer: ({ data }: { data: Record<string, unknown> }) => <output aria-label="Arte de trabalho">{JSON.stringify(data)}</output>,
}));
vi.mock('../modals/price-label-editor/PriceLabelEditorHeader', () => ({
  PriceLabelEditorHeader: ({ onBackToErp }: { onBackToErp: () => void }) => <button onClick={onBackToErp}>Salvar arte e voltar</button>,
}));
vi.mock('../modals/price-label-editor/PriceLabelMenuBar', () => ({
  PriceLabelMenuBar: ({ onOpenDataFillModal }: { onOpenDataFillModal: () => void }) => <button onClick={onOpenDataFillModal}>Preencher arte</button>,
}));
vi.mock('../modals/price-label-editor/PriceLabelEditorFooter', () => ({
  PriceLabelEditorFooter: ({ autoSaveStatus }: { autoSaveStatus: string }) => <output aria-label="Estado de gravação">{autoSaveStatus}</output>,
}));
vi.mock('../modals/price-label-editor/PriceLabelSelectedElementToolbar', () => ({ PriceLabelSelectedElementToolbar: () => null }));
vi.mock('../modals/price-label-editor/PriceLabelColorPickerPopup', () => ({ PriceLabelColorPickerPopup: () => null }));
vi.mock('../modals/PriceLabelLayersModal', () => ({ PriceLabelLayersModal: () => null }));
vi.mock('../modals/PriceLabelOpportunityModal', () => ({ PriceLabelOpportunityModal: () => null }));
vi.mock('../modals/PriceLabelTestValuesModal', () => ({ PriceLabelTestValuesModal: () => null }));
vi.mock('../modals/LabelAssetLibraryModal', () => ({ default: () => null }));
vi.mock('../modals/LabelCopyCategoryModal', () => ({ default: () => null }));
vi.mock('../modals/LabelCustomDesignModal', () => ({ default: () => null }));
vi.mock('../modals/LabelDeleteConfirmModal', () => ({ default: () => null }));
vi.mock('../modals/LabelGridModelModal', () => ({ default: () => null }));
vi.mock('../modals/LabelImageModal', () => ({ default: () => null }));
vi.mock('../modals/LabelModelManagerModal', () => ({ default: () => null }));
vi.mock('../modals/LabelNewAssetModal', () => ({ default: () => null }));

const id = '00000000-0000-4000-8000-000000000001', otherId = '00000000-0000-4000-8000-000000000002';
const initialArt = { globalSnapshot: { title: 'ANTES', normalPrice: '499,00', promoPrice: '399', centsText: ',00', currencySymbol: 'R$', installments: '10x' } };
type Response = { data: unknown; error: unknown; status?: number };
type Payload = Record<string, unknown>;
const transport = { readArt: vi.fn<() => Promise<Response>>(), readOpportunities: vi.fn<() => Promise<Response>>(),
  write: vi.fn<(table: string, payload: Payload, target: string) => Promise<Response>>() };
const ack = (table: string, payload: Payload, target: string): Response => ({ data: { ...payload, ...(table === 'label_layouts' ? { id: target } : {}) }, error: null, status: 200 });
function deferred<T>() { let resolve!: (value: T) => void; const promise = new Promise<T>((done) => { resolve = done; }); return { promise, resolve }; }
async function advance(ms = 0) { await act(async () => { await vi.advanceTimersByTimeAsync(ms); }); }
const read = <T,>(label: string): T => JSON.parse(screen.getByLabelText(label).textContent || '{}');
const publishedConfig = () => read<LabelConfig>('Configuração publicada');
const publishedCache = () => read<Record<string, LabelConfig['artConfig']>>('Cache publicado');
function Page() {
  const [config, setConfig] = useState<LabelConfig>(() => ({ ...createInitialLabelConfig(), layoutId: id, category: 'precos', artConfig: initialArt }));
  const [category, setCategory] = useState<'precos' | 'logos'>('precos');
  const [isOpen, setIsOpen] = useState(true);
  const [cache, setCache] = useState<Record<string, NonNullable<LabelConfig['artConfig']>>>({});
  const [version, setVersion] = useState(0);
  const props = { config, setConfig, selectedCategory: category, isPriceLabelArtEditorOpen: isOpen, setIsPriceLabelArtEditorOpen: setIsOpen,
    savedArtConfigs: cache, setSavedArtConfigs: setCache, setArtVersion: setVersion, publishPriceLabelTemplateUpdate } as unknown as ModalsSectionProps;
  return <>
    <button onClick={() => setConfig((previous) => ({ ...previous, layoutId: otherId }))}>Trocar layout externo</button>
    <button onClick={() => setCategory('logos')}>Trocar categoria externa</button>
    <button onClick={() => setIsOpen(false)}>Fechar editor externo</button>
    <button onClick={() => setIsOpen(true)}>Reabrir editor</button>
    <output aria-label="Configuração publicada">{JSON.stringify(config)}</output>
    <output aria-label="Cache publicado">{JSON.stringify(cache)}</output>
    <output aria-label="Versão publicada">{version}</output>
    <ModalsSection {...props} />
  </>;
}
async function open() { const view = render(<Page />); await advance(1000); vi.mocked(publishPriceLabelTemplateUpdate).mockClear(); return view; }
async function changeTitle(title = 'ARTE NOVA') {
  fireEvent.click(screen.getByText('Preencher arte')); fireEvent.click(screen.getByText('Preenchimento Manual'));
  fireEvent.change(screen.getByPlaceholderText('Ex: COLCHÃO DE ESPUMA D28...'), { target: { value: title } });
  fireEvent.click(screen.getByText('Aplicar na Etiqueta')); await advance(); await advance(500);
}
beforeEach(() => {
  vi.useFakeTimers(); vi.clearAllMocks(); vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
  transport.readArt.mockReset().mockResolvedValue({ data: null, error: null });
  transport.readOpportunities.mockReset().mockResolvedValue({ data: [], error: null });
  transport.write.mockReset().mockImplementation(async (table, payload, target) => ack(table, payload, target));
  vi.mocked(searchProductsForLabelResult).mockReset().mockResolvedValue({ data: [], error: null });
  vi.mocked(supabase.from).mockImplementation((table) => {
    let payload: Payload | undefined, target = '';
    const query = {
      upsert: (value: Payload) => { payload = value; return query; }, update: (value: Payload) => { payload = value; return query; },
      eq: (_field: string, value: string) => { target = value; return query; },
      select: () => table === 'opportunities' ? transport.readOpportunities() : query,
      maybeSingle: () => transport.readArt(), single: () => transport.write(table, payload!, target),
    };
    return query as never;
  });
});
afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); });

describe('arte pela seção, editor, resolver, coordenador e confirmações reais', () => {
  it('publica configuração/cache/evento somente após os dois ACKs de conteúdo', async () => {
    const first = deferred<Response>(), second = deferred<Response>();
    transport.write.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
    await open(); const before = publishedConfig(), cache = publishedCache(), version = screen.getByLabelText('Versão publicada').textContent;
    await changeTitle(); expect(transport.write).toHaveBeenCalledTimes(1);
    expect(publishedConfig()).toEqual(before); expect(publishedCache()).toEqual(cache);
    expect(publishPriceLabelTemplateUpdate).not.toHaveBeenCalled(); expect(screen.getByLabelText('Estado de gravação').textContent).toBe('saving');
    const [table, payload, target] = transport.write.mock.calls[0];
    await act(async () => { first.resolve(ack(table, payload, target)); }); expect(transport.write).toHaveBeenCalledTimes(2);
    expect(publishedConfig()).toEqual(before); expect(publishedCache()).toEqual(cache);
    expect(publishPriceLabelTemplateUpdate).not.toHaveBeenCalled();
    const [table2, payload2, target2] = transport.write.mock.calls[1];
    await act(async () => { second.resolve(ack(table2, payload2, target2)); });
    expect(publishedConfig().text).toBe('ARTE NOVA'); expect(publishedCache()[id]?.globalSnapshot?.title).toBe('ARTE NOVA');
    expect(publishPriceLabelTemplateUpdate).toHaveBeenCalledTimes(1); expect(screen.getByLabelText('Versão publicada').textContent).not.toBe(version);
    expect(screen.getByLabelText('Estado de gravação').textContent).toBe('saved');
  });

  it.each(['missing', 'known'])('não publica quando segundo ACK falha: %s', async (kind) => {
    transport.write.mockImplementationOnce(async (table, payload, target) => ack(table, payload, target));
    transport.write.mockResolvedValueOnce({ data: null, error: kind === 'known' ? { code: '42501' } : null });
    await open(); const before = publishedConfig(), cache = publishedCache(); await changeTitle();
    expect(transport.write).toHaveBeenCalledTimes(2); expect(publishedConfig()).toEqual(before); expect(publishedCache()).toEqual(cache);
    expect(publishPriceLabelTemplateUpdate).not.toHaveBeenCalled(); expect(screen.getByRole('alert').textContent).toContain('arte foi salva');
    expect(screen.getByLabelText('Estado de gravação').textContent).toBe('error');
  });

  it.each(['layout', 'category', 'close'])('contexto externo %s impede segundo envio e publicação de resposta antiga', async (owner) => {
    const first = deferred<Response>(); transport.write.mockReturnValueOnce(first.promise); await open(); await changeTitle();
    expect(transport.write).toHaveBeenCalledTimes(1);
    const cache = publishedCache(), oldTitle = publishedConfig().text;
    fireEvent.click(screen.getByText(owner === 'layout' ? 'Trocar layout externo' : owner === 'category' ? 'Trocar categoria externa' : 'Fechar editor externo'));
    await advance(); const [table, payload, target] = transport.write.mock.calls[0];
    await act(async () => { first.resolve(ack(table, payload, target)); });
    expect(transport.write).toHaveBeenCalledTimes(1); expect(publishedConfig().text).toBe(oldTitle); expect(publishPriceLabelTemplateUpdate).not.toHaveBeenCalled();
    expect(publishedCache()[id]?.globalSnapshot?.title).toBe(cache[id]?.globalSnapshot?.title);
  });

  it('rejeição conhecida conserva rascunho e exige retry explícito antes de gravar', async () => {
    transport.write.mockResolvedValueOnce({ data: null, error: { code: '42501' } });
    await open(); const before = publishedConfig(); await changeTitle();
    expect(transport.write).toHaveBeenCalledTimes(1); expect(publishedConfig()).toEqual(before);
    expect(screen.getByText('Tentar salvar novamente')).toBeTruthy(); await advance(1000); expect(transport.write).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByText('Tentar salvar novamente')); await advance();
    expect(transport.write).toHaveBeenCalledTimes(3); expect(publishedConfig().text).toBe('ARTE NOVA');
    expect(publishPriceLabelTemplateUpdate).toHaveBeenCalledTimes(1);
  });

  it('retry repara gravação parcial mesmo quando o rascunho volta ao snapshot original', async () => {
    transport.write.mockImplementationOnce(async (table, payload, target) => ack(table, payload, target));
    transport.write.mockResolvedValueOnce({ data: null, error: { code: '42501' } });
    await open(); await changeTitle('ARTE PARCIAL');
    expect(transport.write).toHaveBeenCalledTimes(2); expect(publishPriceLabelTemplateUpdate).not.toHaveBeenCalled();
    expect((transport.write.mock.calls[0][1].art_config as typeof initialArt).globalSnapshot.title).toBe('ARTE PARCIAL');
    await changeTitle('ANTES'); expect(transport.write).toHaveBeenCalledTimes(2);
    fireEvent.click(screen.getByText('Tentar salvar novamente')); await advance();
    expect(transport.write).toHaveBeenCalledTimes(4);
    expect((transport.write.mock.calls[2][1].art_config as typeof initialArt).globalSnapshot.title).toBe('ANTES');
    expect((transport.write.mock.calls[3][1].art_config as typeof initialArt).globalSnapshot.title).toBe('ANTES');
    expect(publishedConfig().text).toBe('ANTES'); expect(publishedCache()[id]?.globalSnapshot?.title).toBe('ANTES');
    expect(publishPriceLabelTemplateUpdate).toHaveBeenCalledTimes(1); expect(screen.getByLabelText('Estado de gravação').textContent).toBe('saved');
  });

  it('resultado incerto bloqueia nova gravação inclusive em outra abertura do mesmo layout', async () => {
    transport.write.mockResolvedValueOnce({ data: null, error: { code: '08006' } });
    await open(); const before = publishedConfig(); await changeTitle();
    expect(transport.write).toHaveBeenCalledTimes(1); expect(publishedConfig()).toEqual(before);
    expect(screen.queryByText('Tentar salvar novamente')).toBeNull(); expect(screen.getByRole('alert')).toBeTruthy();
    fireEvent.click(screen.getByText('Fechar editor externo')); await advance(); fireEvent.click(screen.getByText('Reabrir editor')); await advance(1000);
    expect(screen.getByRole('alert')).toBeTruthy(); expect(screen.queryByText('Tentar salvar novamente')).toBeNull();
    expect(screen.getByText('Preencher arte').closest('fieldset')?.disabled).toBe(true);
    expect(transport.write).toHaveBeenCalledTimes(1); expect(publishPriceLabelTemplateUpdate).not.toHaveBeenCalled();
  });

  it('falha de consulta não vira ausência nem libera edição/gravação; ausência confirmada libera', async () => {
    transport.readArt.mockResolvedValueOnce({ data: null, error: { code: '42501' } });
    await open(); expect(screen.getByRole('alert')).toBeTruthy(); expect(transport.write).not.toHaveBeenCalled();
    expect(screen.getByText('Preencher arte').closest('fieldset')?.disabled).toBe(true);
    expect(publishedCache()[id]).toBeUndefined();
    fireEvent.click(screen.getByText('Consultar arte novamente')); await advance();
    expect(screen.queryByRole('alert')).toBeNull(); expect(screen.getByText('Preencher arte').closest('fieldset')?.disabled).toBe(false);
    await changeTitle(); expect(transport.write).toHaveBeenCalledTimes(2); expect(publishedConfig().text).toBe('ARTE NOVA');
  });
});
