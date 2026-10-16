// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ProductEcommerceTab from './ProductEcommerceTab';
import { uploadOptimizedProductImage } from './images/productImageUpload';

vi.mock('./images/SquareImageCropper', () => ({
  SquareImageCropper: ({ imageUrl, onCancel, onConfirm }: any) => (
    <div role="dialog" data-testid="mock-cropper">
      <span>Cropping: {imageUrl}</span>
      <button
        onClick={() =>
          onConfirm(new File(['dummy'], 'cropped.webp', { type: 'image/webp' }))
        }
      >
        Salvar Recorte
      </button>
    </div>
  ),
}));

vi.mock('./images/productImageUpload', () => ({
  uploadOptimizedProductImage: vi.fn(),
}));

describe('ProductEcommerceTab image limits', () => {
  afterEach(() => cleanup());
  beforeEach(() => {
    vi.mocked(uploadOptimizedProductImage).mockResolvedValue('photo-1-cropped.webp');
  });

  const renderTab = (variationCount: number, images: string[] = []) =>
    render(
      <ProductEcommerceTab
        formData={{
          images,
          variations: Array.from({ length: variationCount }, (_, index) => ({
            id: `variation-${index}`,
            sku: `SKU-${index}`,
            name: `Variação ${index + 1}`,
            stock: 0,
            unitPrice: 0,
            active: false,
            attributes: [],
            images: [],
          })),
        }}
        setFormData={vi.fn()}
        handleFileChange={vi.fn()}
        removePhoto={vi.fn()}
      />
    );

  it('shows the fixed 75 photo gallery limit regardless of variation count', () => {
    renderTab(2);

    const notice = screen.getByRole('note', { name: 'Limite de fotos do produto' });
    expect(notice.textContent).toContain('Limite da galeria: 75 fotos');
    expect(notice.textContent).toContain('Cada variação pode vincular até 15 fotos desta galeria');
  });

  it('keeps the 75 photo limit when the product has no variations or single variation', () => {
    renderTab(0);

    const notice = screen.getByRole('note', { name: 'Limite de fotos do produto' });
    expect(notice.textContent).toContain('Limite da galeria: 75 fotos');
    expect(notice.textContent).toContain('Cada variação pode vincular até 15 fotos desta galeria');
  });

  it('warns when existing photos exceed the 75 cap without hiding them', () => {
    renderTab(
      1,
      Array.from({ length: 76 }, (_, index) => `photo-${index}`)
    );

    const notice = screen.getByRole('note', { name: 'Limite de fotos do produto' });
    expect(notice.textContent).toContain('possui 76 fotos, acima do limite de 75');
    expect(screen.getByText('Galeria (76/75)')).toBeTruthy();
    expect(screen.queryByText('Adicionar')).toBeNull();
  });

  it('does not render cover badge or define cover button on gallery photos', () => {
    renderTab(1, ['photo-1.jpg', 'photo-2.jpg']);

    expect(screen.queryByText('Capa')).toBeNull();
    expect(screen.queryByText('Definir Capa')).toBeNull();
  });

  it('hides photo actions with pointer-events-none by default and reveals them on click', () => {
    renderTab(1, ['photo-1.jpg']);

    const deleteBtn = screen.getByTitle('Apagar foto');
    const overlay = deleteBtn.closest('div.absolute.inset-0');
    expect(overlay).toBeTruthy();
    expect(overlay?.className).toContain('pointer-events-none');
    expect(overlay?.className).toContain('opacity-0');

    // Ao clicar no card da foto, o overlay se torna visível e clicável
    const photoImg = screen.getByAltText('Foto 1');
    const card = photoImg.closest('div.group');
    expect(card).toBeTruthy();
    card && fireEvent.click(card);

    expect(overlay?.className).toContain('pointer-events-auto');
    expect(overlay?.className).toContain('opacity-100');
  });

  it('substitui foto no produto pai e em todas as variações ao recortar', async () => {
    let state = {
      images: ['photo-1.jpg', 'photo-2.jpg'],
      variations: [
        { id: 'v1', name: 'Var 1', images: ['photo-1.jpg', 'other.jpg'] },
        { id: 'v2', name: 'Var 2', images: ['photo-2.jpg'] },
      ],
    };
    const setFormData = vi.fn((updater) => {
      state = typeof updater === 'function' ? updater(state) : updater;
    });

    render(
      <ProductEcommerceTab
        formData={state as any}
        setFormData={setFormData}
        handleFileChange={vi.fn()}
        removePhoto={vi.fn()}
      />
    );

    const cropBtn = screen.getAllByTitle('Recortar foto em 1:1')[0];
    fireEvent.click(cropBtn);

    const confirmBtn = await screen.findByText('Salvar Recorte');
    fireEvent.click(confirmBtn);

    await vi.waitFor(() => {
      expect(state.images).toEqual(['photo-1-cropped.webp', 'photo-2.jpg']);
      expect(state.variations[0].images).toEqual(['photo-1-cropped.webp', 'other.jpg']);
      expect(state.variations[1].images).toEqual(['photo-2.jpg']);
    });
  });
});
