// @vitest-environment happy-dom
import React from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useLabelPrintingState } from '../hooks/useLabelPrintingState';
import { ModalsSection } from '../sections/ModalsSection';
import { createInitialLabelConfig } from '../services/labelModelMapper';
import { useLabelCategory } from '../hooks/useLabelCategory';
import { fetchLabelImages } from '../services/labelImageService';
vi.mock('react-toastify', () => ({ toast: { success: vi.fn(), info: vi.fn(), error: vi.fn() } }));
vi.mock('react-router-dom', () => ({ useLocation: () => ({ pathname: '/stock/labels' }), useSearchParams: () => [new URLSearchParams()] }));
vi.mock('../hooks/useLabelCategory', () => ({ useLabelCategory: vi.fn() }));
vi.mock('../hooks/useLabelLayouts', () => ({ useLabelLayouts: () => ({ config: createInitialLabelConfig(), customLayouts: [], savedArtConfigs: {}, layoutModels: [] }) }));
vi.mock('../hooks/useLabelProducts', () => ({ useLabelProducts: () => ({ products: [], selectedProductToAdd: null }) }));
vi.mock('../hooks/useLabelQueue', () => ({ useLabelQueue: () => {
  const [logoItems, setLogoItems] = React.useState([]);
  return { logoItems, setLogoItems, setLabelItems: vi.fn() };
} }));
vi.mock('../hooks/useLabelPreview', () => ({ useLabelPreview: () => ({}) }));
vi.mock('../services/labelGridModelPersistence', () => ({ findIdenticalGridModel: vi.fn(), saveGridModelWithFallback: vi.fn() }));
vi.mock('../services/labelLayoutService', () => ({ persistPriceLabelArtwork: vi.fn() }));
vi.mock('../services/labelImageService', () => ({ fetchLabelImages: vi.fn(), createLabelImage: vi.fn(), deleteLabelImage: vi.fn() }));
vi.mock('../modals/LabelCopyCategoryModal', () => ({ default: () => null }));
vi.mock('../modals/LabelDeleteConfirmModal', () => ({ default: () => null }));
vi.mock('../modals/LabelGridModelModal', () => ({ default: () => null }));
vi.mock('../modals/LabelModelManagerModal', () => ({ default: () => null }));
vi.mock('../modals/PriceLabelArtEditorModal', () => ({ default: () => null }));
function PageHarness() {
  const s = useLabelPrintingState();
  return <>
    <button onClick={() => { s.setIsNewLogoModalOpen(true); s.setNewLogoName('LOGO'); s.setNewLogoImage('/logo.svg'); }}>Novo logo</button>
    <button onClick={() => { s.setIsLabelModalOpen(true); s.setLabelFormName('RÓTULO'); s.setLabelFormImage('/logo.svg'); }}>Novo rótulo</button>
    <button onClick={() => s.setIsImageModalOpen(true)}>Abrir biblioteca</button>
    <button onClick={() => s.setIsAssetManagerModalOpen(true)}>Abrir ativos</button>
    <span aria-label="Fila de logos">{JSON.stringify(s.logoItems)}</span>
    <span aria-label="Imagem selecionada">{s.selectedImage}</span>
    <ModalsSection {...s} handleCopyToCategory={async () => true} />
  </>;
}
beforeEach(() => {
  vi.restoreAllMocks(); window.localStorage.clear(); vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  vi.mocked(useLabelCategory).mockReturnValue({ selectedCategory: 'logos' } as ReturnType<typeof useLabelCategory>);
  vi.mocked(fetchLabelImages).mockResolvedValue([{ id: 7, name: 'BIBLIOTECA', image: '/biblioteca.svg', category: 'historica' }]);
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });
describe('label asset owner through real page facade and ModalsSection', () => {
  it.each(['logo', 'rótulo'])('forwards progress, disabled fields, close protection and storage errors for %s', async (kind) => {
    render(<PageHarness />); fireEvent.click(screen.getByText(kind === 'logo' ? 'Novo logo' : 'Novo rótulo'));
    vi.spyOn(window.localStorage, 'setItem').mockImplementation(() => { throw new Error('Quota'); });
    const submit = screen.getByText(kind === 'logo' ? 'Salvar na Biblioteca' : 'Criar Rótulo Definido') as HTMLButtonElement;
    fireEvent.click(submit);
    expect(submit.disabled).toBe(true); expect(screen.getByRole('status').textContent).toContain('gravando');
    const input = screen.getByLabelText(kind === 'logo' ? 'Nome do Ativo' : 'Nome do Rótulo') as HTMLInputElement;
    expect(input.disabled).toBe(true); fireEvent.click(screen.getByText('Cancelar')); expect(input.isConnected).toBe(true);
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('gravar'));
    expect(input.isConnected).toBe(true); expect(input.disabled).toBe(false);
  });
  it.each(['logos', 'precos'] as const)('seleciona pela biblioteca real da página para %s e fecha o proprietário', async (category) => {
    vi.mocked(useLabelCategory).mockReturnValue({ selectedCategory: category } as ReturnType<typeof useLabelCategory>);
    render(<PageHarness />); fireEvent.click(screen.getByText('Abrir biblioteca'));
    const button = await screen.findByRole('button', { name: 'Selecionar imagem BIBLIOTECA' });
    fireEvent.click(button);
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    if (category === 'logos') {
      expect(JSON.parse(screen.getByLabelText('Fila de logos').textContent || '[]')).toEqual([
        { image: '/biblioteca.svg', quantity: 1, imageFit: 'contain', name: 'DA BIBLIOTECA' },
      ]);
    } else expect(screen.getByLabelText('Imagem selecionada').textContent).toBe('/biblioteca.svg');
  });

  it('mostra progresso/erro do upload inicial pela biblioteca de ativos real e protege fechamento', async () => {
    const read = vi.spyOn(FileReader.prototype, 'readAsDataURL').mockImplementation(() => undefined);
    render(<PageHarness />); fireEvent.click(screen.getByText('Abrir ativos'));
    const input = screen.getByLabelText('Carregar ativo de etiqueta') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [new File(['image'], 'logo.png', { type: 'image/png' })] } });
    await waitFor(() => expect(read).toHaveBeenCalledTimes(1));
    expect(input.disabled).toBe(true); expect(screen.getByRole('status').textContent).toContain('Lendo');
    fireEvent.click(screen.getByLabelText('Fechar ativos')); fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    expect(screen.getByRole('dialog')).toBeTruthy();
    await act(async () => { (read.mock.contexts[0] as FileReader).dispatchEvent(new Event('error')); });
    expect(screen.getByRole('alert').textContent).toContain('ler a imagem'); expect(input.disabled).toBe(false);
    fireEvent.click(screen.getByLabelText('Fechar ativos')); fireEvent.click(screen.getByText('Abrir ativos'));
    expect(screen.queryByRole('alert')).toBeNull();
  });
});

