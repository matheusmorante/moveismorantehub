// @vitest-environment happy-dom
import React from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import FixedAspectImageCropper from '../../pages/App/Marketing/Posts/FixedAspectImageCropper';
import { SquareImageCropper } from '../../pages/App/Products/components/tabs/images/SquareImageCropper';
import { rectangularImageCropFormSchema, squareImageCropFormSchema } from '../../../../shared-utils/fileFormSchemas';

const mocks = vi.hoisted(() => ({ compress: vi.fn(), error: vi.fn(), draw: vi.fn(), createUrl: vi.fn() }));
vi.mock('@/pages/utils/imageUtils', () => ({ compressImageToFile: mocks.compress }));
vi.mock('react-toastify', () => ({ toast: { error: mocks.error } }));
afterEach(cleanup);
beforeEach(() => {
  vi.clearAllMocks();
  mocks.compress.mockImplementation(async (file: File) => file);
  mocks.createUrl.mockReturnValue('blob:preview');
  vi.spyOn(URL, 'createObjectURL').mockImplementation(mocks.createUrl);
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
  vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(800);
  vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(200);
  vi.spyOn(HTMLImageElement.prototype, 'naturalWidth', 'get').mockReturnValue(1600);
  vi.spyOn(HTMLImageElement.prototype, 'naturalHeight', 'get').mockReturnValue(400);
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({ drawImage: mocks.draw, fillRect: vi.fn() } as never);
  vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation((callback) => callback(new Blob(['cropped'], { type: 'image/png' })));
});
const image = () => new File(['image'], 'photo.png', { type: 'image/png' });

describe('crop form owners', () => {
  it('rejects out-of-bounds, non-finite geometry and unsupported padding in shared contracts', () => {
    const bounds = { displayWidth: 800, displayHeight: 200, sourceWidth: 1600, sourceHeight: 400 };
    expect(rectangularImageCropFormSchema.safeParse({ ...bounds, files: [image()], selection: { x: 790, y: 0, width: 20, height: 20 } }).success).toBe(false);
    expect(squareImageCropFormSchema.safeParse({ ...bounds, image: 'data:image/png;base64,x', paddingPercent: 36, selection: { x: 0, y: 0, size: 100 } }).success).toBe(false);
    expect(squareImageCropFormSchema.safeParse({ ...bounds, sourceWidth: Infinity, image: 'data:image/png;base64,x', paddingPercent: 0, selection: { x: 0, y: 0, size: 100 } }).success).toBe(false);
  });

  it('blocks invalid image input before creating an object URL', async () => {
    render(<FixedAspectImageCropper file={new File(['text'], 'text.txt', { type: 'text/plain' })} kind="seal" onCancel={vi.fn()} onConfirm={vi.fn()} />);
    await waitFor(() => expect(mocks.error).toHaveBeenCalledWith('Selecione um arquivo de imagem.'));
    expect(mocks.createUrl).not.toHaveBeenCalled();
    expect(mocks.draw).not.toHaveBeenCalled();
  });

  it('blocks zero source dimensions before canvas work', async () => {
    vi.spyOn(HTMLImageElement.prototype, 'naturalWidth', 'get').mockReturnValue(0);
    render(<FixedAspectImageCropper file={image()} kind="seal" onCancel={vi.fn()} onConfirm={vi.fn()} />);
    fireEvent.load(await screen.findByAltText('Imagem inteira para recorte'));
    fireEvent.click(screen.getByText('Aplicar recorte'));
    await waitFor(() => expect(mocks.error).toHaveBeenCalled());
    expect(mocks.draw).not.toHaveBeenCalled();
    expect(mocks.compress).not.toHaveBeenCalled();
  });

  it('uses parsed rectangle geometry and prevents a second crop while compressing', async () => {
    let finish!: (file: File) => void;
    mocks.compress.mockImplementationOnce(() => new Promise<File>((resolve) => { finish = resolve; }));
    const confirm = vi.fn();
    render(<FixedAspectImageCropper file={image()} kind="seal" onCancel={vi.fn()} onConfirm={confirm} />);
    const source = await screen.findByAltText('Imagem inteira para recorte');
    fireEvent.load(source);
    fireEvent.click(screen.getByText('Aplicar recorte'));
    await waitFor(() => expect(mocks.compress).toHaveBeenCalledTimes(1));
    fireEvent.click(screen.getByText('Aplicar recorte'));
    expect(mocks.draw).toHaveBeenCalledTimes(1);
    expect(mocks.draw).toHaveBeenCalledWith(source, 96, 24, 1408, 352, 0, 0, 800, 200);
    await act(async () => { finish(image()); });
    await waitFor(() => expect(confirm).toHaveBeenCalledTimes(1));
  });

  it('applies the square crop through the resolver and prevents duplicate compression', async () => {
    let finish!: (file: File) => void;
    mocks.compress.mockImplementationOnce(() => new Promise<File>((resolve) => { finish = resolve; }));
    const confirm = vi.fn();
    render(<SquareImageCropper imageUrl="data:image/png;base64,image" onCancel={vi.fn()} onConfirm={confirm} />);
    fireEvent.load(await screen.findByAltText('Recorte do produto'));
    const button = screen.getByRole('button', { name: 'Concluir e Salvar' });
    fireEvent.click(button);
    await waitFor(() => expect(mocks.compress).toHaveBeenCalledTimes(1));
    fireEvent.click(button);
    expect(mocks.compress).toHaveBeenCalledTimes(1);
    await act(async () => { finish(image()); });
    await waitFor(() => expect(confirm).toHaveBeenCalledTimes(1));
  });
});
