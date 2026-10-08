// @vitest-environment happy-dom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import ProductEcommerceTab from './ProductEcommerceTab';

vi.mock('./images/SquareImageCropper', () => ({
  SquareImageCropper: () => null,
}));

describe('ProductEcommerceTab image limits', () => {
  afterEach(() => cleanup());

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

  it('shows the parent limit and add-variation guidance', () => {
    renderTab(2);

    const notice = screen.getByRole('note', { name: 'Limite de fotos do produto' });
    expect(notice.textContent).toContain('30 foto(s)');
    expect(notice.textContent).toContain('2 × 15');
    expect(notice.textContent).toContain('adicione outra');
    expect(notice.textContent).toContain('vincular até 15 fotos');
  });

  it('keeps a 15 photo baseline when the product has no variations', () => {
    renderTab(0);

    const notice = screen.getByRole('note', { name: 'Limite de fotos do produto' });
    expect(notice.textContent).toContain('15 foto(s)');
    expect(notice.textContent).toContain('Sem variações, o limite é 15 fotos');
  });

  it('warns when existing photos exceed the current cap without hiding them', () => {
    renderTab(1, Array.from({ length: 16 }, (_, index) => `photo-${index}`));

    const notice = screen.getByRole('note', { name: 'Limite de fotos do produto' });
    expect(notice.textContent).toContain('possui 16 fotos, acima do limite atual');
    expect(screen.getByText('Galeria (16/15)')).toBeTruthy();
    expect(screen.queryByText('Adicionar')).toBeNull();
  });
});
