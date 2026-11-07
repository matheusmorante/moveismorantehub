// @vitest-environment happy-dom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import SiteElementFormModal from './SiteElementFormModal';
import { type SiteElementModel } from './siteElementService';

const mocks = vi.hoisted(() => ({ save: vi.fn(), imageWidth: 1920, imageHeight: 620 }));
vi.mock('./siteElementService', () => ({
  saveSiteElementModel: mocks.save,
  siteElementImageUrl: (path: string) => `https://example.com/${path}`,
  siteElementErrorMessage: (error: Error) => error.message,
}));
const original: SiteElementModel = { id: 'model', kind: 'carousel', name: 'Anterior', image_path: 'existing.png', file_name: 'existing.png',
  mime_type: 'image/png', size_bytes: 10, width: 1920, height: 620, updated_at: '' };
afterEach(() => { cleanup(); vi.useRealTimers(); vi.unstubAllGlobals(); });
beforeEach(() => {
  vi.clearAllMocks(); mocks.save.mockResolvedValue({ cleanupFailed: false });
  mocks.imageWidth = 1920; mocks.imageHeight = 620;
  const BaseURL = URL;
  vi.stubGlobal('URL', class extends BaseURL {
    static createObjectURL = vi.fn(() => 'blob:site-model');
    static revokeObjectURL = vi.fn();
  });
  vi.stubGlobal('Image', class {
    naturalWidth = mocks.imageWidth; naturalHeight = mocks.imageHeight;
    onload: (() => void) | null = null;
    onerror: (() => void) | null = null;
    set src(_value: string) { queueMicrotask(() => this.onload?.()); }
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
    await screen.findByText('Selecione a imagem do modelo.');
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
  it('reads a valid image, previews it and saves parsed values only after the resolver', async () => {
    const onSaved = vi.fn();
    render(<SiteElementFormModal kind="carousel" onClose={vi.fn()} onSaved={onSaved} />);
    fireEvent.change(screen.getByLabelText(/Nome do modelo/), { target: { value: '  Novembro  ' } });
    const file = new File(['image'], 'banner.png', { type: 'image/png' });
    fireEvent.change(screen.getByLabelText(/Arquivo da imagem/), { target: { files: [file] } });
    await screen.findByAltText('Prévia da imagem do modelo');
    await waitFor(() => expect((screen.getByRole('button', { name: 'Salvar modelo' }) as HTMLButtonElement).disabled).toBe(false));
    fireEvent.click(screen.getByRole('button', { name: 'Salvar modelo' }));
    await waitFor(() => expect(onSaved).toHaveBeenCalledWith(false));
    expect(mocks.save).toHaveBeenCalledWith(expect.objectContaining({ name: 'Novembro', file, width: 1920, height: 620 }), undefined);
  });
  it('rejects an image with incorrect dimensions before any upload', async () => {
    mocks.imageWidth = 1080;
    render(<SiteElementFormModal kind="carousel" model={original} onClose={vi.fn()} onSaved={vi.fn()} />);
    fireEvent.change(screen.getByLabelText(/Arquivo da imagem/), { target: { files: [new File(['image'], 'wrong.png', { type: 'image/png' })] } });
    await screen.findByText(/A imagem tem 1080/);
    fireEvent.click(screen.getByRole('button', { name: 'Salvar modelo' }));
    await screen.findByText('A imagem deve ter exatamente 1920 × 620 px.');
    expect(mocks.save).not.toHaveBeenCalled();
  });
  it('does not reuse a previously selected image when the next file is invalid', async () => {
    render(<SiteElementFormModal kind="carousel" onClose={vi.fn()} onSaved={vi.fn()} />);
    fireEvent.change(screen.getByLabelText(/Nome do modelo/), { target: { value: 'Novembro' } });
    fireEvent.change(screen.getByLabelText(/Arquivo da imagem/), { target: { files: [new File(['image'], 'valid.png', { type: 'image/png' })] } });
    await screen.findByAltText('Prévia da imagem do modelo');
    await waitFor(() => expect((screen.getByRole('button', { name: 'Salvar modelo' }) as HTMLButtonElement).disabled).toBe(false));
    fireEvent.change(screen.getByLabelText(/Arquivo da imagem/), { target: { files: [new File(['text'], 'invalid.txt', { type: 'text/plain' })] } });
    await screen.findByText('Use uma imagem PNG, JPG ou WebP.');
    fireEvent.click(screen.getByRole('button', { name: 'Salvar modelo' }));
    await screen.findByText('Selecione a imagem do modelo.');
    expect(mocks.save).not.toHaveBeenCalled();
  });
});
