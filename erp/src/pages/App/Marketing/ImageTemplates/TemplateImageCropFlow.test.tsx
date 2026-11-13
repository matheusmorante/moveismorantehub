// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeAll, beforeEach, expect, it, vi } from 'vitest';
import { createImageLayer, startImageTemplate, type ImageLayer, type ImageLayout, type ImageTemplateFormValues } from '../../../../../../shared-utils/catalogImageTemplate';
import ImageTemplateEditor from './ImageTemplateEditor';

const mocks = vi.hoisted(() => ({ save: vi.fn(), prepare: vi.fn() }));
const originalAsset = { id: 'a'.repeat(64), webp_base64: 'b3JpZ2luYWw=' };
const croppedAsset = { id: 'b'.repeat(64), webp_base64: 'Y3JvcHBlZA==' };
vi.mock('@/context/AuthContext', () => ({ useAuth: () => ({ profile: { role: 'manager' } }) }));
vi.mock('@/pages/utils/images/imageContentBounds', () => ({ imageContentBounds: () => ({ x: 100, y: 60, width: 300, height: 200 }) }));
vi.mock('./TemplateProductPreview', () => ({ TemplateProductPreview: () => null,
  useTemplateProductPreview: () => ({ product: null, productId: '', detail: {} }) }));
vi.mock('./renderImageTemplate', () => ({ createTemplatePictureLoader: () => vi.fn(),
  renderImageTemplate: async () => ({ errors: [], notices: [] }),
  interpolateTemplateFields: (text: string) => text, measureTextLayerSafetyBounds: vi.fn() }));
vi.mock('./imageTemplateService', () => ({ saveImageTemplate: mocks.save, prepareTemplateAsset: mocks.prepare,
  readTemplateAssets: async () => [{ id: 'a'.repeat(64), webp_base64: 'b3JpZ2luYWw=' }],
  assetSource: (asset: { webp_base64: string }) => `data:image/webp;base64,${asset.webp_base64}`,
  imageTemplateError: (error: Error) => error.message }));
vi.mock('./TemplateArtboard', () => ({ TemplateArtboard: ({ layout, assets }: {
  layout: ImageLayout; assets: { sources: ReadonlyMap<string, string> };
}) => {
  const image = layout.layers.find((layer) => layer.type === 'image') as Extract<ImageLayer, { type: 'image' }>;
  return <output data-testid="preview">{JSON.stringify({ ...image, source: assets.sources.get(image.assetId!) })}</output>;
} }));

beforeAll(() => {
  if (!HTMLDialogElement.prototype.showModal) HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', ''); };
  if (!HTMLDialogElement.prototype.close) HTMLDialogElement.prototype.close = function () { this.removeAttribute('open'); };
});
beforeEach(() => {
  mocks.save.mockReset().mockResolvedValue({ id: crypto.randomUUID(), name: 'Modelo', updated_at: '2026-11-10T20:00:00Z' });
  mocks.prepare.mockReset().mockResolvedValue(croppedAsset);
  vi.spyOn(HTMLImageElement.prototype, 'naturalWidth', 'get').mockReturnValue(600);
  vi.spyOn(HTMLImageElement.prototype, 'naturalHeight', 'get').mockReturnValue(400);
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({ drawImage: vi.fn() } as never);
  vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation((callback) => callback(new Blob(['crop'], { type: 'image/webp' })));
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

it('mantém o novo arquivo na prévia e no salvamento sem mover, redimensionar ou salvar o modelo ao confirmar o recorte', async () => {
  const image = { ...createImageLayer('image', '1:1') as Extract<ImageLayer, { type: 'image' }>,
    assetId: originalAsset.id, assetName: 'movel.png', fit: 'cover' as const };
  const initial: ImageTemplateFormValues = { name: 'Modelo', description: '', design: startImageTemplate('blank') };
  initial.design.formats['1:1'].layers.unshift(image);
  render(<ImageTemplateEditor initial={initial} original={null} userId="operator" onBack={vi.fn()} onSaved={vi.fn()} />);
  await waitFor(() => expect(screen.getByRole<HTMLButtonElement>('button', { name: 'Recortar imagem' }).disabled).toBe(false));
  fireEvent.click(screen.getByRole('button', { name: 'Recortar imagem' }));
  fireEvent.load(screen.getByAltText('Imagem para recortar'));
  fireEvent.click(screen.getByRole('button', { name: 'Aplicar recorte' }));
  await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Recortar imagem' })).toBeNull());
  expect(mocks.save).not.toHaveBeenCalled();
  expect(mocks.prepare).toHaveBeenCalledWith(expect.objectContaining({ name: 'movel-recortada.webp', type: 'image/webp' }));
  const expected = { x: image.x, y: image.y, width: image.width, height: image.height,
    assetId: croppedAsset.id, fit: 'contain', source: `data:image/webp;base64,${croppedAsset.webp_base64}` };
  expect(JSON.parse(screen.getByTestId('preview').textContent!)).toMatchObject(expected);
  expect(screen.queryByRole('checkbox', { name: 'Cortar para preencher' })).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));
  await screen.findByText('Modelo salvo.');
  expect(mocks.save).toHaveBeenCalledOnce();
  const [, values, , pending] = mocks.save.mock.calls[0];
  expect(values.design.formats['1:1'].layers.find((layer: ImageLayer) => layer.id === image.id)).toMatchObject({ assetId: croppedAsset.id, fit: 'contain' });
  expect(pending.get(croppedAsset.id)).toEqual(croppedAsset);
  expect(JSON.parse(screen.getByTestId('preview').textContent!)).toMatchObject(expected);
});
