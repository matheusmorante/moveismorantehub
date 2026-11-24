// @vitest-environment happy-dom
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import SiteElementFormModal from './SiteElementFormModal';
import { type SiteElementModel } from './siteElementService';

const mocks = vi.hoisted(() => ({ save: vi.fn(), draw: vi.fn() }));
vi.mock('./siteElementService', () => ({
  saveSiteElementModel: mocks.save,
  siteElementImageUrl: (path: string) => `https://example.com/${path}`,
  siteElementErrorMessage: (error: Error) => error.message,
}));
const original: SiteElementModel = { id: 'model', kind: 'carousel', name: 'Anterior', image_path: 'existing.png', file_name: 'existing.png',
  mime_type: 'image/png', size_bytes: 10, width: 1920, height: 620, updated_at: '' };
afterEach(cleanup);
beforeEach(() => {
  vi.clearAllMocks(); mocks.save.mockResolvedValue({ cleanupFailed: false });
  vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:site-model');
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
  vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(800);
  vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(450);
  vi.spyOn(HTMLImageElement.prototype, 'naturalWidth', 'get').mockReturnValue(1600);
  vi.spyOn(HTMLImageElement.prototype, 'naturalHeight', 'get').mockReturnValue(900);
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({ drawImage: mocks.draw } as never);
  vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation((callback) => {
    callback(new Blob(['cropped'], { type: 'image/webp' }));
  });
});

describe('site element form owner', () => {
  it('runs the resolver before effects and displays required errors', async () => {
    render(<SiteElementFormModal kind="carousel" onClose={vi.fn()} onSaved={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Salvar modelo' }));
    await screen.findByText('Informe o nome do modelo.');
    expect(mocks.save).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText(/Nome do modelo/), { target: { value: 'Novembro' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar modelo' }));
    await screen.findByText('Selecione a imagem para desktop.');
    expect(screen.getByText('Selecione a imagem para tablet.')).toBeTruthy();
    expect(screen.getByText('Selecione a imagem para mobile.')).toBeTruthy();
    expect(mocks.save).not.toHaveBeenCalled();
  });
  it('submits the parsed name, supports rename without a new file, and blocks closing/duplicate effects while saving', async () => {
    let resolve!: (value: { cleanupFailed: boolean }) => void;
    mocks.save.mockReturnValue(new Promise((yes) => { resolve = yes; }));
    const onSaved = vi.fn(); const onClose = vi.fn();
    render(<SiteElementFormModal kind="carousel" model={original} onClose={onClose} onSaved={onSaved} />);
    fireEvent.change(screen.getByLabelText(/Nome do modelo/), { target: { value: '  Novembro  ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar modelo' }));
    await waitFor(() => expect(mocks.save).toHaveBeenCalledOnce());
    expect(mocks.save).toHaveBeenCalledWith(expect.objectContaining({ name: 'Novembro', file: null }), original);
    fireEvent.click(screen.getByRole('button', { name: 'Salvar modelo' }));
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(mocks.save).toHaveBeenCalledOnce(); expect(onClose).not.toHaveBeenCalled();
    await act(async () => resolve({ cleanupFailed: false }));
    await waitFor(() => expect(onSaved).toHaveBeenCalledWith(false));
  });
  it('shows a service refusal without discarding the draft', async () => {
    mocks.save.mockRejectedValue(new Error('Sem permissão'));
    render(<SiteElementFormModal kind="carousel" model={original} onClose={vi.fn()} onSaved={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Salvar modelo' }));
    await screen.findByRole('alert');
    expect(screen.getByRole('alert').textContent).toBe('Sem permissão');
    expect((screen.getByLabelText(/Nome do modelo/) as HTMLInputElement).value).toBe('Anterior');
  });
  it('loads the banner destination and submits a validated link without replacing images', async () => {
    const model = { ...original, link_url: '/promocoes' };
    render(<SiteElementFormModal kind="carousel" model={model} onClose={vi.fn()} onSaved={vi.fn()} />);
    const link = screen.getByLabelText('Link de destino');
    expect(link).toHaveProperty('value', '/promocoes');
    fireEvent.change(link, { target: { value: '//exemplo.com' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar modelo' }));
    await screen.findByRole('alert');
    expect(mocks.save).not.toHaveBeenCalled();
    fireEvent.change(link, { target: { value: '  /?type=salvados#produtos  ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar modelo' }));
    await waitFor(() => expect(mocks.save).toHaveBeenCalledWith(expect.objectContaining({
      linkUrl: '/?type=salvados#produtos', file: null,
    }), model));
  });
  it('crops each device version and saves the three confirmed results together', async () => {
    const onSaved = vi.fn();
    render(<SiteElementFormModal kind="carousel" onClose={vi.fn()} onSaved={onSaved} />);
    fireEvent.change(screen.getByLabelText(/Nome do modelo/), { target: { value: '  Novembro  ' } });
    const file = new File(['image'], 'banner.png', { type: 'image/png' });
    const saveButton = screen.getByRole('button', { name: 'Salvar modelo' });
    for (const [device, width, height] of [['desktop', 1920, 600], ['tablet', 1200, 600], ['mobile', 800, 800]] as const) {
      fireEvent.change(screen.getByLabelText(new RegExp(`^${device}`, 'i')), { target: { files: [file] } });
      const crop = within(screen.getByRole('dialog', { name: `Recortar imagem para ${device}` }));
      expect(crop.getByText(new RegExp(`saída ${width} × ${height} px`))).toBeTruthy();
      expect(saveButton).toHaveProperty('disabled', true);
      expect(screen.queryByAltText(`Prévia de ${device}`)).toBeNull();
      const source = await crop.findByAltText('Imagem inteira para recorte');
      fireEvent.load(source);
      fireEvent.click(crop.getByRole('button', { name: 'Concluir' }));
      await screen.findByAltText(`Prévia de ${device}`);
      expect(mocks.draw).toHaveBeenLastCalledWith(
        source, expect.any(Number), expect.any(Number), expect.any(Number), expect.any(Number), 0, 0, width, height,
      );
    }
    expect(mocks.save).not.toHaveBeenCalled();
    fireEvent.click(saveButton);
    await waitFor(() => expect(onSaved).toHaveBeenCalledWith(false));
    expect(mocks.save).toHaveBeenCalledWith(expect.objectContaining({
      name: 'Novembro', width: 1920, height: 600,
      file: expect.objectContaining({ type: 'image/webp' }),
      tablet: expect.objectContaining({ width: 1200, height: 600, file: expect.any(File) }),
      mobile: expect.objectContaining({ width: 800, height: 800, file: expect.any(File) }),
    }), undefined);
  });
  it('cancels an in-progress crop without replacing the existing image or losing the draft', async () => {
    let completeCrop!: BlobCallback;
    vi.mocked(HTMLCanvasElement.prototype.toBlob).mockImplementationOnce((callback) => { completeCrop = callback; });
    const onClose = vi.fn();
    render(<SiteElementFormModal kind="carousel" model={original} onClose={onClose} onSaved={vi.fn()} />);
    fireEvent.change(screen.getByLabelText(/Nome do modelo/), { target: { value: 'Novembro' } });
    fireEvent.change(screen.getByLabelText(/^Desktop/), { target: { files: [new File(['image'], 'replacement.png', { type: 'image/png' })] } });
    const dialog = screen.getByRole('dialog', { name: 'Recortar imagem para desktop' });
    const crop = within(dialog);
    fireEvent.load(await crop.findByAltText('Imagem inteira para recorte'));
    fireEvent.click(crop.getByRole('button', { name: 'Concluir' }));
    await waitFor(() => expect(completeCrop).toBeTypeOf('function'));
    fireEvent.click(crop.getByRole('button', { name: 'Cancelar' }));
    await act(async () => completeCrop(new Blob(['cropped'], { type: 'image/webp' })));
    expect(dialog.isConnected).toBe(false);
    expect((screen.getByLabelText(/Nome do modelo/) as HTMLInputElement).value).toBe('Novembro');
    expect(screen.getByAltText('Prévia de desktop').getAttribute('src')).toBe('https://example.com/existing.png');
    expect(onClose).not.toHaveBeenCalled();
    expect(mocks.save).not.toHaveBeenCalled();
  });
  it('does not reuse a previously selected image when the next file is invalid', async () => {
    render(<SiteElementFormModal kind="carousel" onClose={vi.fn()} onSaved={vi.fn()} />);
    fireEvent.change(screen.getByLabelText(/Nome do modelo/), { target: { value: 'Novembro' } });
    fireEvent.change(screen.getByLabelText(/^Desktop/), { target: { files: [new File(['image'], 'valid.png', { type: 'image/png' })] } });
    const crop = within(screen.getByRole('dialog', { name: 'Recortar imagem para desktop' }));
    fireEvent.load(await crop.findByAltText('Imagem inteira para recorte'));
    fireEvent.click(crop.getByRole('button', { name: 'Concluir' }));
    await screen.findByAltText('Prévia de desktop');
    fireEvent.change(screen.getByLabelText(/^Desktop/), { target: { files: [new File(['text'], 'invalid.txt', { type: 'text/plain' })] } });
    await screen.findByText('Use uma imagem PNG, JPG ou WebP.');
    fireEvent.click(screen.getByRole('button', { name: 'Salvar modelo' }));
    await screen.findByText('Selecione a imagem para desktop.');
    expect(mocks.save).not.toHaveBeenCalled();
  });
});
