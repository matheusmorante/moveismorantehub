// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeAll, beforeEach, expect, it, vi } from 'vitest';
import { TemplateImageCropDialog } from './TemplateImageCropDialog';

const mocks = vi.hoisted(() => ({
  bounds: { x: 100, y: 60, width: 300, height: 200 },
  draw: vi.fn(),
}));
vi.mock('@/pages/utils/imageContentBounds', () => ({ imageContentBounds: () => ({ ...mocks.bounds }) }));

beforeAll(() => {
  if (!HTMLDialogElement.prototype.showModal) HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', ''); };
  if (!HTMLDialogElement.prototype.close) HTMLDialogElement.prototype.close = function () { this.removeAttribute('open'); };
});
beforeEach(() => {
  mocks.bounds = { x: 100, y: 60, width: 300, height: 200 };
  vi.spyOn(HTMLImageElement.prototype, 'naturalWidth', 'get').mockReturnValue(600);
  vi.spyOn(HTMLImageElement.prototype, 'naturalHeight', 'get').mockReturnValue(400);
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({ drawImage: mocks.draw } as never);
  vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation((callback) => callback(new Blob(['crop'], { type: 'image/webp' })));
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

function openCrop() {
  const saveModel = vi.fn();
  const confirm = vi.fn().mockResolvedValue(true);
  render(<form onSubmit={(event) => { event.preventDefault(); saveModel(); }}>
    <TemplateImageCropDialog source="data:image/png;base64,image" filename="movel.png" onCancel={vi.fn()} onConfirm={confirm} />
  </form>);
  const image = screen.getByAltText('Imagem para recortar');
  fireEvent.load(image);
  return { saveModel, confirm, image };
}

it('aplica os pixels selecionados sem enviar o formulário do modelo através do portal', async () => {
  const { saveModel, confirm, image } = openCrop();
  fireEvent.click(screen.getByRole('button', { name: 'Aplicar recorte' }));
  await waitFor(() => expect(confirm).toHaveBeenCalledOnce());
  expect(saveModel).not.toHaveBeenCalled();
  expect(mocks.draw).toHaveBeenCalledWith(image, 100, 60, 300, 200, 0, 0, 300, 200);
  expect(confirm.mock.calls[0][0]).toMatchObject({ name: 'movel-recortada.webp', type: 'image/webp' });
});

it('bloqueia um recorte inválido sem disparar um salvamento do modelo', async () => {
  mocks.bounds = { x: 590, y: 0, width: 300, height: 200 };
  const { saveModel, confirm } = openCrop();
  fireEvent.click(screen.getByRole('button', { name: 'Aplicar recorte' }));
  await screen.findByRole('alert');
  expect(confirm).not.toHaveBeenCalled();
  expect(saveModel).not.toHaveBeenCalled();
});
