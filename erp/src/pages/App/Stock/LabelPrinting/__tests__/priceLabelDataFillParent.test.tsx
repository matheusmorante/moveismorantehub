// @vitest-environment happy-dom
// @vitest-environment-options {"settings":{"disableCSSFileLoading":true,"disableJavaScriptFileLoading":true,"handleDisabledFileLoadingAsSuccess":true}}
import React from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PriceLabelArtEditorModal } from '../modals/PriceLabelArtEditorModal';
import { searchProductsForLabelResult } from '../services/priceLabelCatalogService';
import { createInitialLabelConfig } from '../services/labelModelMapper';
import type { LabelConfig } from '../utils/LabelConstants';
import { toast } from 'react-toastify';
import { exportLabelImage } from '../services/priceLabelExportService';
import { fetchPriceLabelArtConfigResult, fetchOpportunitiesResult } from '../services/priceLabelPersistenceService';
import type { PriceLabelArtEditorModalProps } from '../types/PriceLabelArtEditorTypes';

vi.mock('../services/priceLabelCatalogService', () => ({ searchProductsForLabelResult: vi.fn() }));
vi.mock('../services/priceLabelExportService', () => ({ exportLabelImage: vi.fn() }));
vi.mock('../services/priceLabelPersistenceService', () => ({
  fetchPriceLabelArtConfigResult: vi.fn(async () => ({ data: null, error: null })),
  fetchOpportunitiesResult: vi.fn(async () => ({ data: [{ id: 'offer', name: 'Oferta' }], error: null })),
}));
vi.mock('react-toastify', () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }));
vi.mock('../hooks/usePriceLabelLayerSelection', () => ({ usePriceLabelLayerSelection: () => vi.fn() }));
vi.mock('../components/PriceLabelArtRenderer', () => ({
  PriceLabelArtRenderer: ({ data }: { data: Record<string, unknown> }) => <output aria-label="Arte renderizada">{JSON.stringify(data)}</output>,
}));
vi.mock('../modals/price-label-editor/PriceLabelEditorHeader', () => ({
  PriceLabelEditorHeader: ({ onBackToErp }: { onBackToErp: () => void }) => <button onClick={onBackToErp}>Salvar arte e voltar</button>,
}));
vi.mock('../modals/price-label-editor/PriceLabelMenuBar', () => ({
  PriceLabelMenuBar: ({ onOpenDataFillModal, onSelectOpportunityContext, onDownloadPng, onCopyImage, onRenameTitle, onOpenTestValuesModal }: {
    onOpenDataFillModal: () => void; onSelectOpportunityContext: (id: string) => void;
    onDownloadPng: () => void; onCopyImage: () => void; onRenameTitle: () => void; onOpenTestValuesModal: () => void;
  }) => <>
    <button onClick={onOpenDataFillModal}>Abrir preenchimento</button>
    <button onClick={() => onSelectOpportunityContext('offer')}>Trocar oportunidade</button>
    <button onClick={onDownloadPng}>Baixar PNG</button><button onClick={onCopyImage}>Copiar imagem</button>
    <button onClick={onRenameTitle}>Nomear arte</button><button onClick={onOpenTestValuesModal}>Testar valores</button>
  </>,
}));
vi.mock('../modals/price-label-editor/PriceLabelSelectedElementToolbar', () => ({ PriceLabelSelectedElementToolbar: ({ setScaleTens }: { setScaleTens: (value: number) => void }) => <>
  <button onClick={() => setScaleTens(-1)}>Escala inválida</button><button onClick={() => setScaleTens(0)}>Escala zero</button>
</> }));
vi.mock('../modals/price-label-editor/PriceLabelColorPickerPopup', () => ({ PriceLabelColorPickerPopup: () => null }));
vi.mock('../modals/price-label-editor/PriceLabelEditorFooter', () => ({ PriceLabelEditorFooter: () => null }));
vi.mock('../modals/PriceLabelLayersModal', () => ({ PriceLabelLayersModal: () => null }));
vi.mock('../modals/PriceLabelOpportunityModal', () => ({ PriceLabelOpportunityModal: () => null }));

const initial = { title: 'ANTES', normalPrice: '499,00', promoPrice: '399', centsText: ',00', currencySymbol: 'R$', installments: '10x sem juros' };
const product = { id: 'product-1', name: 'mesa especial', description: 'Mesa', code: 'M1', unit_price: 1200.5, promo_price: 900.25, images: [] };
const preview = (): Record<string, unknown> => JSON.parse(screen.getByLabelText('Arte renderizada').textContent || '{}');
const dialog = () => screen.getByRole('dialog', { name: 'Dados da etiqueta de preço' });
async function advance(ms = 0) { await act(async () => { await vi.advanceTimersByTimeAsync(ms); }); }
function deferred<T>() { let resolve!: (value: T) => void; let reject!: (reason: unknown) => void; const promise = new Promise<T>((done, fail) => { resolve = done; reject = fail; }); return { promise, resolve, reject }; }
async function open(showTitle = true, initialProduct?: PriceLabelArtEditorModalProps['initialProduct']) {
  const config: LabelConfig = { ...createInitialLabelConfig(), layoutId: 'layout-1', category: 'precos', text: initial.title,
    price: initial.normalPrice, promoPrice: initial.promoPrice, artConfig: { globalSnapshot: { ...initial, showTitle } } };
  const props = { isOpen: true, onClose: vi.fn(), onArtConfigLoaded: vi.fn(), onSaveConfig: vi.fn<(updated: Partial<LabelConfig>, stillCurrent?: () => boolean) => Promise<boolean>>().mockResolvedValue(true), config, initialProduct };
  const view = render(<PriceLabelArtEditorModal {...props} />);
  await advance(1000); props.onSaveConfig.mockClear();
  fireEvent.click(screen.getByText('Abrir preenchimento')); await advance();
  return { ...view, props };
}
const manual = () => fireEvent.click(screen.getByText('Preenchimento Manual'));
const submit = () => fireEvent.click(screen.getByText('Aplicar na Etiqueta'));
const setManual = (values: typeof initial) => {
  const placeholders = ['Ex: COLCHÃO DE ESPUMA D28...', 'Ex: 499,00', 'Ex: 299', 'Ex: ,00', 'Ex: R$', 'Ex: Em até 10x sem juros no cartão'];
  Object.values(values).forEach((value, index) => fireEvent.change(screen.getByPlaceholderText(placeholders[index]), { target: { value } }));
};
async function openActions() {
  const view = await open(); fireEvent.click(screen.getByLabelText('Fechar dados da etiqueta')); await advance();
  return view;
}
beforeEach(() => { vi.useFakeTimers(); vi.clearAllMocks(); vi.mocked(searchProductsForLabelResult).mockReset().mockResolvedValue({ data: [], error: null });
  vi.mocked(fetchPriceLabelArtConfigResult).mockReset().mockResolvedValue({ data: null, error: null });
  vi.mocked(fetchOpportunitiesResult).mockReset().mockResolvedValue({ data: [{ id: 'offer', name: 'Oferta' }], error: null });
});
afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); });

describe('ações da arte com resolver e proprietário reais', () => {
  it('renomeia com título parseado, salva pelo proprietário e impede submissão duplicada', async () => {
    const view = await openActions(); vi.spyOn(window, 'prompt').mockReturnValue('  mesa nova  ');
    fireEvent.click(screen.getByText('Nomear arte')); fireEvent.click(screen.getByText('Nomear arte')); await advance();
    expect(window.prompt).toHaveBeenCalledOnce(); expect(preview().title).toBe('MESA NOVA');
    expect(toast.success).toHaveBeenCalledOnce(); await advance(600);
    expect(view.props.onSaveConfig).toHaveBeenCalledOnce();
    expect(view.props.onSaveConfig.mock.calls[0][0]).toMatchObject({ artConfig: { globalSnapshot: { title: 'MESA NOVA' } } });
  });
  it.each([null, '   '])('cancelamento/título inválido %s não altera nem salva', async (value) => {
    const view = await openActions(); vi.spyOn(window, 'prompt').mockReturnValue(value);
    fireEvent.click(screen.getByText('Nomear arte')); await advance(600);
    expect(preview().title).toBe(initial.title); expect(view.props.onSaveConfig).not.toHaveBeenCalled(); expect(toast.success).not.toHaveBeenCalled();
    if (value !== null) expect(screen.getByRole('alert').textContent).toContain('título');
  });
  it('não aplica renomeação de uma sessão desmontada durante o resolver', async () => {
    const view = await openActions(); vi.spyOn(window, 'prompt').mockReturnValue('novo');
    fireEvent.click(screen.getByText('Nomear arte')); view.unmount(); await advance(600);
    expect(view.props.onSaveConfig).not.toHaveBeenCalled(); expect(toast.success).not.toHaveBeenCalled();
  });
  it.each([['Baixar PNG', 'download'], ['Copiar imagem', 'copy']])('valida %s e mantém trava até confirmação', async (button, action) => {
    const view = await openActions(); const pending = deferred<void>(); vi.mocked(exportLabelImage).mockReturnValue(pending.promise);
    fireEvent.click(screen.getByText(button)); fireEvent.click(screen.getByText(button)); await advance();
    expect(exportLabelImage).toHaveBeenCalledOnce();
    expect(vi.mocked(exportLabelImage).mock.calls[0][1]).toMatchObject({ layoutId: 'layout-1', action, snapshot: initial });
    expect(screen.getByText('Preparando a ação da arte...')).toBeTruthy(); expect(toast.success).not.toHaveBeenCalled();
    fireEvent.click(screen.getByText('Salvar arte e voltar')); expect(view.props.onClose).not.toHaveBeenCalled();
    pending.resolve(); await advance(); expect(toast.success).toHaveBeenCalledOnce();
    expect(screen.queryByText('Preparando a ação da arte...')).toBeNull(); expect(view.props.onSaveConfig).not.toHaveBeenCalled();
  });
  it('rejeita arte inválida antes de exportar e mostra erro', async () => {
    await openActions(); fireEvent.click(screen.getByText('Escala inválida')); await advance();
    fireEvent.click(screen.getByText('Baixar PNG')); await advance();
    expect(exportLabelImage).not.toHaveBeenCalled(); expect(screen.getByRole('alert')).toBeTruthy();
  });
  it('falha de exportação libera a ação e permite repetição explícita', async () => {
    await openActions(); vi.mocked(exportLabelImage).mockRejectedValueOnce(new Error('Clipboard sem permissão')).mockResolvedValueOnce();
    fireEvent.click(screen.getByText('Copiar imagem')); await advance();
    expect(screen.getByRole('alert').textContent).toContain('sem permissão'); expect(toast.success).not.toHaveBeenCalled();
    fireEvent.click(screen.getByText('Baixar PNG')); await advance();
    expect(exportLabelImage).toHaveBeenCalledTimes(2); expect(screen.queryByRole('alert')).toBeNull(); expect(toast.success).toHaveBeenCalledOnce();
  });
  it('trocar modelo invalida a guarda e a confirmação da exportação anterior', async () => {
    const view = await openActions(); const pending = deferred<void>(); vi.mocked(exportLabelImage).mockReturnValue(pending.promise);
    fireEvent.click(screen.getByText('Baixar PNG')); await advance();
    const guard = vi.mocked(exportLabelImage).mock.calls[0][2]; expect(guard()).toBe(true);
    view.rerender(<PriceLabelArtEditorModal {...view.props} config={{ ...view.props.config, layoutId: 'outro' }} />); await advance();
    expect(guard()).toBe(false); pending.resolve(); await advance(); expect(toast.success).not.toHaveBeenCalled();
    expect(view.props.onSaveConfig).not.toHaveBeenCalled();
  });
  it('dígitos da prévia não alteram preços persistidos nem geram autosave ao concluir', async () => {
    const view = await openActions(); const before = preview(); fireEvent.click(screen.getByText('Testar valores')); await advance();
    fireEvent.change(screen.getByRole('slider', { name: 'Dezena: 1º dígito' }), { target: { value: '0' } });
    fireEvent.change(screen.getByRole('slider', { name: 'Preço anterior: 1º dígito' }), { target: { value: '0' } }); await advance(600);
    expect(preview().testDezenaStr).toBe('09'); expect(preview().normalPrice).toBe('099,00'); expect(view.props.onSaveConfig).not.toHaveBeenCalled();
    fireEvent.click(screen.getByText('Baixar PNG')); await advance();
    expect(exportLabelImage).not.toHaveBeenCalled(); expect(screen.getByRole('alert').textContent).toContain('Conclua o teste');
    fireEvent.click(screen.getByText('Concluir Teste')); await advance(600);
    expect(preview()).toEqual(before); expect(view.props.onSaveConfig).not.toHaveBeenCalled();
    fireEvent.click(screen.getByText('Salvar arte e voltar')); await advance(); expect(view.props.onClose).toHaveBeenCalledOnce();
  });
});

describe('preenchimento no editor e estado de arte reais', () => {
  it('isola rascunho da renderização e do snapshot salvo até Aplicar', async () => {
    const view = await open(); manual(); const before = preview();
    setManual({ title: 'rascunho', normalPrice: '0', promoPrice: '0', centsText: ',25', currencySymbol: '$', installments: 'à vista' });
    await advance(1000); expect(preview()).toEqual(before); expect(view.props.onSaveConfig).not.toHaveBeenCalled();
    fireEvent.click(screen.getByLabelText('Fechar dados da etiqueta')); await advance();
    fireEvent.click(screen.getByText('Abrir preenchimento')); manual();
    expect((screen.getByPlaceholderText('Ex: COLCHÃO DE ESPUMA D28...') as HTMLInputElement).value).toBe(initial.title);
    expect(preview()).toEqual(before); expect(view.props.onSaveConfig).not.toHaveBeenCalled();
  });

  it('aplica seis valores parseados uma vez e o pai pode salvar o snapshot completo', async () => {
    const view = await open(); manual();
    const values = { title: 'mesa nova', normalPrice: 'R$ 0,00', promoPrice: '12,35', centsText: ',35', currencySymbol: '$', installments: '3x de R$ 4,12' };
    setManual(values); submit(); submit(); await advance();
    expect(screen.queryByRole('dialog', { name: 'Dados da etiqueta de preço' })).toBeNull();
    expect(toast.success).toHaveBeenCalledTimes(1);
    expect(preview()).toMatchObject({ ...values, title: 'MESA NOVA', normalPrice: '0,00' });
    await advance(600); expect(view.props.onSaveConfig).toHaveBeenCalledTimes(1);
    const saved = view.props.onSaveConfig.mock.calls[0][0] as Partial<LabelConfig>;
    expect(saved).toMatchObject({ text: 'MESA NOVA', price: 'R$ 0,00', promoPrice: '12,35',
      artConfig: { globalSnapshot: { ...values, title: 'MESA NOVA' } } });
    expect(view.props.onClose).not.toHaveBeenCalled();
  });

  it('catálogo muda apenas título/showTitle e conserva preços e demais textos do pai', async () => {
    vi.mocked(searchProductsForLabelResult).mockResolvedValue({ data: [product], error: null });
    const view = await open(false); expect(preview().showTitle).toBe(false); await advance(150);
    fireEvent.click(screen.getByLabelText('Aplicar nome de mesa especial')); await advance();
    expect(preview()).toMatchObject({ ...initial, title: 'MESA ESPECIAL', showTitle: true });
    expect(screen.queryByRole('dialog', { name: 'Dados da etiqueta de preço' })).toBeNull();
    await advance(600); const saved = view.props.onSaveConfig.mock.calls.at(-1)?.[0] as Partial<LabelConfig>;
    expect(saved).toMatchObject({ text: 'MESA ESPECIAL', price: initial.normalPrice, promoPrice: initial.promoPrice,
      artConfig: { globalSnapshot: { ...initial, title: 'MESA ESPECIAL', showTitle: true } } });
    expect(toast.success).toHaveBeenCalledTimes(1);
  });

  it.each(['layout', 'opportunity'])('resposta de abertura anterior não publica nem fecha nova ao mudar %s', async (owner) => {
    const request = deferred<{ data: typeof product[]; error: Error | null }>();
    vi.mocked(searchProductsForLabelResult).mockReturnValueOnce(request.promise);
    const view = await open(); await advance(150); expect(searchProductsForLabelResult).toHaveBeenCalledTimes(1);
    const oldDialog = dialog();
    if (owner === 'layout') view.rerender(<PriceLabelArtEditorModal {...view.props} config={{ ...view.props.config, layoutId: 'layout-2' }} />);
    else fireEvent.click(screen.getByText('Trocar oportunidade'));
    await advance(); const newDialog = dialog(); expect(newDialog).not.toBe(oldDialog);
    manual(); fireEvent.change(screen.getByPlaceholderText('Ex: COLCHÃO DE ESPUMA D28...'), { target: { value: 'Novo rascunho' } });
    await act(async () => { request.resolve({ data: [product], error: null }); });
    expect(dialog()).toBe(newDialog); expect(screen.queryByLabelText('Aplicar nome de mesa especial')).toBeNull();
    expect((screen.getByPlaceholderText('Ex: COLCHÃO DE ESPUMA D28...') as HTMLInputElement).value).toBe('NOVO RASCUNHO');
    expect(preview().title).toBe(initial.title); expect(toast.success).not.toHaveBeenCalled();
  });

  it.each(['layout', 'opportunity'])('resolver da abertura anterior não aplica nem fecha nova após mudar %s', async (owner) => {
    const view = await open(); manual();
    fireEvent.change(screen.getByPlaceholderText('Ex: COLCHÃO DE ESPUMA D28...'), { target: { value: 'Rascunho antigo' } });
    const oldDialog = dialog(); submit();
    if (owner === 'layout') view.rerender(<PriceLabelArtEditorModal {...view.props} config={{ ...view.props.config, layoutId: 'layout-2' }} />);
    else fireEvent.click(screen.getByText('Trocar oportunidade'));
    const newDialog = dialog(); expect(newDialog).not.toBe(oldDialog);
    await advance(); expect(dialog()).toBe(newDialog); expect(preview().title).toBe(initial.title);
    expect(toast.success).not.toHaveBeenCalled();
    manual(); expect((screen.getByPlaceholderText('Ex: COLCHÃO DE ESPUMA D28...') as HTMLInputElement).value).toBe(initial.title);
  });
});

describe('fila e lifetime do proprietário real da arte', () => {
  async function applyTitle(value: string) {
    if (!screen.queryByRole('dialog', { name: 'Dados da etiqueta de preço' })) fireEvent.click(screen.getByText('Abrir preenchimento'));
    manual(); fireEvent.change(screen.getByPlaceholderText('Ex: COLCHÃO DE ESPUMA D28...'), { target: { value } });
    submit(); await advance(); await advance(600);
  }
  it('serializa intenções congeladas e não perde a última edição enquanto a primeira aguarda confirmação', async () => {
    const view = await open(), request = deferred<boolean>();
    view.props.onSaveConfig.mockReturnValueOnce(request.promise);
    await applyTitle('primeiro'); await applyTitle('segundo'); await applyTitle('último');
    expect(view.props.onSaveConfig).toHaveBeenCalledTimes(1);
    await act(async () => { request.resolve(true); }); await advance();
    expect(view.props.onSaveConfig.mock.calls.map(([values]) => values.text)).toEqual(['PRIMEIRO', 'SEGUNDO', 'ÚLTIMO']);
    expect(view.props.onSaveConfig.mock.calls.map(([values]) => values.artConfig?.globalSnapshot?.title)).toEqual(['PRIMEIRO', 'SEGUNDO', 'ÚLTIMO']);
    fireEvent.click(screen.getByText('Salvar arte e voltar')); await advance();
    expect(view.props.onClose).toHaveBeenCalledTimes(1);
  });
  it('erro conhecido interrompe as intenções seguintes e só repete o último rascunho por comando explícito', async () => {
    const view = await open(), request = deferred<boolean>(); view.props.onSaveConfig.mockReturnValueOnce(request.promise);
    await applyTitle('primeiro'); await applyTitle('segundo');
    await act(async () => { request.reject(new Error('Permissão negada')); }); await advance();
    expect(view.props.onSaveConfig).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('alert').textContent).toContain('Permissão negada');
    await applyTitle('último'); expect(view.props.onSaveConfig).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByText('Tentar salvar novamente')); await advance();
    expect(view.props.onSaveConfig).toHaveBeenCalledTimes(2);
    expect(view.props.onSaveConfig.mock.calls[1][0].text).toBe('ÚLTIMO');
    expect(screen.queryByRole('alert')).toBeNull();
  });
  it.each([false, undefined])('não confirma retorno %s, bloqueia repetição e conserva bloqueio ao reabrir', async (confirmation) => {
    const view = await open(); view.props.onSaveConfig.mockResolvedValueOnce(confirmation as boolean);
    await applyTitle('nova'); expect(screen.getByRole('alert').textContent).toContain('não foi confirmada');
    expect(screen.queryByText('Tentar salvar novamente')).toBeNull();
    fireEvent.click(screen.getByText('Salvar arte e voltar')); await advance();
    expect(view.props.onClose).not.toHaveBeenCalled();
    view.rerender(<PriceLabelArtEditorModal {...view.props} isOpen={false} />); await advance();
    view.rerender(<PriceLabelArtEditorModal {...view.props} />); await advance(600);
    expect(screen.getByRole('alert').textContent).toContain('não foi confirmada');
    expect(view.props.onSaveConfig).toHaveBeenCalledTimes(1);
  });
  it('resolver do owner rejeita campo filho inválido antes do serviço e permite corrigir para zero', async () => {
    const view = await open(); fireEvent.click(screen.getByLabelText('Fechar dados da etiqueta'));
    fireEvent.click(screen.getByText('Escala inválida')); await advance(600);
    expect(view.props.onSaveConfig).not.toHaveBeenCalled(); expect(screen.getByRole('alert')).toBeTruthy();
    fireEvent.click(screen.getByText('Escala zero')); await advance(600); expect(view.props.onSaveConfig).not.toHaveBeenCalled();
    fireEvent.click(screen.getByText('Tentar salvar novamente')); await advance();
    expect(view.props.onSaveConfig).toHaveBeenCalledTimes(1);
    expect(view.props.onSaveConfig.mock.calls[0][0]).toMatchObject({ priceFontSizeTens: 0, artConfig: { globalSnapshot: { scaleTens: 0 } } });
  });
  it('voltar aguarda a confirmação e cliques repetidos não fecham nem gravam duas vezes', async () => {
    const view = await open(), request = deferred<boolean>(); view.props.onSaveConfig.mockReturnValueOnce(request.promise);
    manual(); fireEvent.change(screen.getByPlaceholderText('Ex: COLCHÃO DE ESPUMA D28...'), { target: { value: 'final' } }); submit(); await advance();
    fireEvent.click(screen.getByText('Salvar arte e voltar')); fireEvent.click(screen.getByText('Salvar arte e voltar')); await advance();
    expect(view.props.onSaveConfig).toHaveBeenCalledTimes(1); expect(view.props.onClose).not.toHaveBeenCalled();
    await act(async () => { request.resolve(true); }); await advance(); expect(view.props.onClose).toHaveBeenCalledTimes(1);
  });
  it('atalhos reais de histórico não alteram a arte depois de iniciar salvar e voltar', async () => {
    const view = await open(); await applyTitle('primeiro'); await applyTitle('segundo');
    const request = deferred<boolean>(); view.props.onSaveConfig.mockReturnValueOnce(request.promise);
    fireEvent.click(screen.getByText('Abrir preenchimento')); manual();
    fireEvent.change(screen.getByPlaceholderText('Ex: COLCHÃO DE ESPUMA D28...'), { target: { value: 'final' } }); submit(); await advance();
    fireEvent.click(screen.getByText('Salvar arte e voltar')); await advance();
    expect(view.props.onClose).not.toHaveBeenCalled(); const before = preview();
    fireEvent.keyDown(window, { key: 'z', ctrlKey: true }); fireEvent.keyDown(document.body, { key: 'y', ctrlKey: true }); await advance(400);
    expect(preview()).toEqual(before); expect(preview().title).toBe('FINAL');
    await act(async () => { request.resolve(true); }); await advance(); expect(view.props.onClose).toHaveBeenCalledTimes(1);
    expect(view.props.onSaveConfig).toHaveBeenCalledTimes(3);
  });
  it('Ctrl+Z e Ctrl+Y reais executam uma única ação de histórico', async () => {
    await open(); await applyTitle('primeiro'); await applyTitle('segundo');
    fireEvent.keyDown(window, { key: 'z', ctrlKey: true }); await advance(); expect(preview().title).toBe('PRIMEIRO');
    fireEvent.keyDown(window, { key: 'y', ctrlKey: true }); await advance(); expect(preview().title).toBe('SEGUNDO');
  });
  it('timeout limita o callback, invalida sua guarda e não aceita confirmação tardia', async () => {
    const view = await open(), request = deferred<boolean>(); view.props.onSaveConfig.mockReturnValueOnce(request.promise);
    await applyTitle('nova'); const stillCurrent = view.props.onSaveConfig.mock.calls[0][1]!; expect(stillCurrent()).toBe(true);
    await advance(45000); expect(stillCurrent()).toBe(false); expect(screen.getByRole('alert').textContent).toContain('não foi confirmada');
    await act(async () => { request.resolve(true); }); await advance();
    expect(screen.getByRole('alert').textContent).toContain('não foi confirmada'); expect(view.props.onClose).not.toHaveBeenCalled();
    expect(view.props.onSaveConfig).toHaveBeenCalledTimes(1);
  });
  it('saída tem prazo total mesmo quando há mais de uma gravação pendente na fila', async () => {
    const view = await open(), first = deferred<boolean>(), second = deferred<boolean>();
    view.props.onSaveConfig.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
    await applyTitle('primeiro'); await applyTitle('último');
    fireEvent.click(screen.getByText('Salvar arte e voltar')); await advance(30000);
    await act(async () => { first.resolve(true); }); await advance();
    expect(view.props.onSaveConfig).toHaveBeenCalledTimes(2);
    const stillCurrent = view.props.onSaveConfig.mock.calls[1][1]!; expect(stillCurrent()).toBe(true);
    await advance(15000); expect(screen.getByRole('alert').textContent).toContain('excedeu o prazo'); expect(stillCurrent()).toBe(false);
    expect(view.props.onClose).not.toHaveBeenCalled();
    await act(async () => { second.resolve(true); }); await advance(); expect(view.props.onClose).not.toHaveBeenCalled();
    expect(screen.getByRole('alert').textContent).toContain('excedeu o prazo');
  });
  it('troca de modelo elimina intenções ainda na fila e invalida a gravação já iniciada', async () => {
    const view = await open(), request = deferred<boolean>(); view.props.onSaveConfig.mockReturnValueOnce(request.promise);
    await applyTitle('antigo'); await applyTitle('fila antiga'); const stillCurrent = view.props.onSaveConfig.mock.calls[0][1]!;
    view.rerender(<PriceLabelArtEditorModal {...view.props} config={{ ...view.props.config, layoutId: 'outro' }} />); await advance(600);
    expect(stillCurrent()).toBe(false);
    await act(async () => { request.resolve(true); }); await advance();
    expect(view.props.onSaveConfig).toHaveBeenCalledTimes(1); expect(screen.queryByRole('alert')).toBeNull(); expect(preview().title).toBe(initial.title);
    expect(view.props.onClose).not.toHaveBeenCalled();
  });
  it('falha na leitura não vira arte ausente nem inicia gravação; retry aplica somente resposta validada', async () => {
    vi.mocked(fetchPriceLabelArtConfigResult).mockResolvedValueOnce({ data: null, error: new Error('Consulta indisponível') });
    const view = await open(); expect(screen.getByRole('alert').textContent).toContain('Consulta indisponível');
    expect(screen.queryByRole('dialog', { name: 'Dados da etiqueta de preço' })).toBeNull(); expect(view.props.onSaveConfig).not.toHaveBeenCalled();
    fireEvent.click(screen.getByText('Consultar arte novamente')); await advance(600);
    expect(screen.queryByRole('alert')).toBeNull(); expect(preview().title).toBe(initial.title); expect(view.props.onSaveConfig).not.toHaveBeenCalled();
  });
  it('retry de oportunidades não recarrega a arte nem descarta edição atual', async () => {
    vi.mocked(fetchOpportunitiesResult).mockResolvedValueOnce({ data: [], error: new Error('Oportunidades indisponíveis') });
    const view = await open(); await applyTitle('edição atual');
    fireEvent.click(screen.getByText('Consultar oportunidades novamente')); await advance(600);
    expect(screen.queryByRole('alert')).toBeNull(); expect(preview().title).toBe('EDIÇÃO ATUAL');
    expect(fetchPriceLabelArtConfigResult).toHaveBeenCalledTimes(1); expect(view.props.onSaveConfig).toHaveBeenCalledTimes(1);
  });
  it('consulta de oportunidades tardia não substitui a seleção feita pelo operador', async () => {
    const request = deferred<Awaited<ReturnType<typeof fetchOpportunitiesResult>>>();
    vi.mocked(fetchOpportunitiesResult).mockReturnValueOnce(request.promise);
    const view = await open(true, { opportunities: { id: 'initial' } });
    fireEvent.click(screen.getByText('Trocar oportunidade')); await advance(600);
    await act(async () => { request.resolve({ data: [{ id: 'initial', name: 'Inicial' }, { id: 'offer', name: 'Oferta' }], error: null }); }); await advance(600);
    expect(view.props.onSaveConfig.mock.calls.at(-1)?.[0].artConfig?.globalSnapshot?.selectedOppId).toBe('offer');
  });
  it('consulta da arte tem prazo no proprietário e ignora resposta tardia', async () => {
    const request = deferred<Awaited<ReturnType<typeof fetchPriceLabelArtConfigResult>>>();
    vi.mocked(fetchPriceLabelArtConfigResult).mockReturnValueOnce(request.promise);
    const view = await open(); expect(screen.getByRole('status').textContent).toContain('Consultando');
    await advance(16000); expect(screen.getByRole('alert').textContent).toContain('excedeu o prazo');
    expect(view.props.onArtConfigLoaded).not.toHaveBeenCalled(); expect(view.props.onSaveConfig).not.toHaveBeenCalled();
    await act(async () => { request.resolve({ data: { globalSnapshot: { title: 'RESPOSTA ANTIGA' } }, error: null }); }); await advance(600);
    expect(view.props.onArtConfigLoaded).not.toHaveBeenCalled(); expect(screen.getByRole('alert').textContent).toContain('excedeu o prazo');
  });
});
