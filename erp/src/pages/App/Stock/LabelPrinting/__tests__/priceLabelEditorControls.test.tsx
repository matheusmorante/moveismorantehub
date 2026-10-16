// @vitest-environment happy-dom
// @vitest-environment-options {"settings":{"disableCSSFileLoading":true,"disableJavaScriptFileLoading":true,"handleDisabledFileLoadingAsSuccess":true}}
import React from 'react';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PriceLabelArtEditorModal } from '../modals/PriceLabelArtEditorModal';
import { createInitialLabelConfig } from '../services/labelModelMapper';
import { exportLabelImage } from '../services/priceLabelExportService';
import type { LabelConfig } from '../utils/LabelConstants';
import type { PriceLabelLayerKey } from '../types/PriceLabelArtEditorTypes';

vi.mock('../services/priceLabelExportService', () => ({ exportLabelImage: vi.fn() }));
vi.mock('../services/priceLabelPersistenceService', () => ({
  fetchPriceLabelArtConfigResult: vi.fn(async () => ({ data: null, error: null })),
  fetchOpportunitiesResult: vi.fn(async () => ({ data: [{ id: 'offer', name: 'Oferta' }, { id: 'sale', name: 'Liquidação' }], error: null })),
}));
vi.mock('../services/priceLabelCatalogService', () => ({ searchProductsForLabelResult: vi.fn() }));
vi.mock('react-toastify', () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }));
vi.mock('../components/PriceLabelArtRenderer', () => ({
  PriceLabelArtRenderer: ({ data, onSelectElement, showSafetyMargin }: { data: object; showSafetyMargin: boolean; onSelectElement: (key: PriceLabelLayerKey, event: React.MouseEvent) => void }) => <>
    <output aria-label="Render">{JSON.stringify({ ...data, showSafetyMargin })}</output>
    {(['title', 'cents', 'promoPrice', 'dePricePorGroup'] as const).map((key) => <button key={key} onClick={(event) => onSelectElement(key, event)}>Selecionar {key}</button>)}
  </>,
}));
async function advance(ms = 0) { await act(async () => { await vi.advanceTimersByTimeAsync(ms); }); }
const preview = () => JSON.parse(screen.getByLabelText('Render').textContent || '{}');
async function open() {
  const config = { ...createInitialLabelConfig(), layoutId: 'model', category: 'precos', artConfig: { globalSnapshot: {
    title: 'MESA', normalPrice: '499,00', promoPrice: '399', titlePos: { x: 15, y: 20 },
  } } } as LabelConfig;
  const save = vi.fn<(updated: Partial<LabelConfig>) => Promise<boolean>>().mockResolvedValue(true);
  const view = render(<PriceLabelArtEditorModal isOpen config={config} onClose={vi.fn()} onSaveConfig={save} />);
  await advance(1000); save.mockClear();
  return { ...view, save };
}
const snapshot = (save: Awaited<ReturnType<typeof open>>['save']) => save.mock.calls.at(-1)?.[0].artConfig?.globalSnapshot;
beforeEach(() => { vi.useFakeTimers(); vi.clearAllMocks(); vi.mocked(exportLabelImage).mockResolvedValue(); });
afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); });

describe('campos filhos no proprietário da arte, sem mock dos controles ou RHF', () => {
  it('menu real renomeia e exporta o snapshot que atravessou o resolver', async () => {
    const s = await open(); vi.spyOn(window, 'prompt').mockReturnValue('  oferta nova ');
    fireEvent.click(screen.getByText('Arquivo')); fireEvent.click(screen.getByText('Nomear Arte')); await advance(); await advance(600);
    expect(snapshot(s.save)?.title).toBe('OFERTA NOVA');
    fireEvent.click(screen.getByText('Arquivo')); fireEvent.click(screen.getByText('Baixar PNG')); await advance();
    expect(exportLabelImage).toHaveBeenCalledOnce(); expect(vi.mocked(exportLabelImage).mock.calls[0][1]).toMatchObject({ action: 'download', snapshot: { title: 'OFERTA NOVA' } });
  });
  it.each(['0', '12.5'])('tamanho individual %s preserva zero/fração nas três magnitudes', async (value) => {
    const s = await open(); fireEvent.click(screen.getByText('Selecionar title'));
    fireEvent.click(screen.getByRole('button', { name: 'Tamanho' }));
    fireEvent.change(screen.getByRole('spinbutton'), { target: { value } }); await advance(600);
    expect(snapshot(s.save)).toMatchObject({ titleFontSizeTens: Number(value), titleFontSizeHundreds: Number(value), titleFontSizeThousands: Number(value) });
  });
  it('valor negativo do controle real é visível e não alcança o serviço', async () => {
    const s = await open(); fireEvent.click(screen.getByText('Selecionar title')); fireEvent.click(screen.getByRole('button', { name: 'Tamanho' }));
    fireEvent.change(screen.getByRole('spinbutton'), { target: { value: '-1' } }); await advance(600);
    expect(s.save).not.toHaveBeenCalled(); expect(screen.getByRole('alert')).toBeTruthy();
  });
  it('seleção em lote altera somente as camadas selecionadas e mantém valores parseados', async () => {
    const s = await open(); fireEvent.click(screen.getByText('Selecionar title')); fireEvent.click(screen.getByText('Selecionar cents'), { shiftKey: true });
    fireEvent.change(screen.getByPlaceholderText('Ex: 24'), { target: { value: '18.25' } });
    const select = screen.getAllByRole('combobox').find((control) => within(control).queryByText('Alterar tipografia...'))!;
    const option = within(select).getAllByRole('option')[2] as HTMLOptionElement; fireEvent.change(select, { target: { value: option.value } }); await advance(600);
    expect(snapshot(s.save)).toMatchObject({ titleFontSizeTens: 18.25, titleFontSizeHundreds: 18.25, centsFontSizeTens: 18.25,
      titleFontFamily: option.value, centsFontFamily: option.value });
    expect(snapshot(s.save)?.normalPrice).toBe('499,00');
  });
  it('escalas/visibilidade e espaçamento do grupo chegam pelo mesmo autosave validado', async () => {
    const s = await open(); fireEvent.click(screen.getByText('Selecionar promoPrice')); fireEvent.click(screen.getByRole('button', { name: 'Tamanho' }));
    const sizes = screen.getAllByRole('spinbutton');
    fireEvent.change(sizes[0], { target: { value: '0' } }); fireEvent.change(sizes[1], { target: { value: '101.5' } });
    fireEvent.click(screen.getByTitle('Ocultar Dezena')); await advance(600);
    expect(snapshot(s.save)).toMatchObject({ scaleTens: 0, scaleHundreds: 101.5, showPromoPriceTens: false });
    fireEvent.click(screen.getByText('Selecionar dePricePorGroup')); fireEvent.change(screen.getByRole('spinbutton'), { target: { value: '0' } }); await advance(600);
    expect(snapshot(s.save)?.dePricePorGroupGap).toBe(0);
  });
  it('seletor real conserva mapas de cores de oportunidades diferentes', async () => {
    const s = await open(); fireEvent.click(screen.getByText('Selecionar title')); fireEvent.click(screen.getByTitle('Alterar Cor'));
    const colors = s.container.querySelectorAll('input[type="color"]'); expect(colors.length).toBeGreaterThan(1);
    fireEvent.change(colors[0], { target: { value: '#112233' } }); fireEvent.change(colors[1], { target: { value: '#445566' } }); await advance(600);
    const saved = s.save.mock.calls.at(-1)![0].artConfig!;
    expect(saved.oppColorsMap).toMatchObject({ none: { title: '#112233' }, offer: { title: '#445566' } });
    expect(preview().titleColor).toBe('#112233');
  });
  it('camadas reais centralizam/ocultam e seleção por si só não grava', async () => {
    const s = await open(); fireEvent.click(screen.getByTitle('Gerenciar Camadas')); await advance(600); expect(s.save).not.toHaveBeenCalled();
    const row = screen.getByText('NOME DO PRODUTO').closest('.flex.items-center.justify-between')!;
    fireEvent.click(within(row as HTMLElement).getByText('Centralizar')); fireEvent.click(within(row as HTMLElement).getByTitle('Ocultar camada')); await advance(600);
    expect(snapshot(s.save)).toMatchObject({ titlePos: { x: 0, y: 0 }, showTitle: false });
  });
  it('margem de segurança muda só a apresentação e não dispara gravação', async () => {
    const s = await open(), before = preview().showSafetyMargin;
    fireEvent.click(screen.getByTitle('Exibir ou ocultar a borda da margem de segurança da impressão')); await advance(600);
    expect(preview().showSafetyMargin).toBe(!before); expect(s.save).not.toHaveBeenCalled();
  });
});
