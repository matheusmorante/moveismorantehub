// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
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
    expect(notice.textContent).toContain('Cada variação acrescenta mais 15 espaços');
    expect(notice.textContent).toContain('pode vincular até 15 fotos');
  });

  it('keeps a 15 photo baseline when the product has no variations', () => {
    renderTab(0);

    const notice = screen.getByRole('note', { name: 'Limite de fotos do produto' });
    expect(notice.textContent).toContain('15 foto(s)');
    expect(notice.textContent).toContain('Cada variação acrescenta mais 15 espaços');
  });

  it('warns when existing photos exceed the current cap without hiding them', () => {
    renderTab(
      1,
      Array.from({ length: 16 }, (_, index) => `photo-${index}`)
    );

    const notice = screen.getByRole('note', { name: 'Limite de fotos do produto' });
    expect(notice.textContent).toContain('possui 16 fotos, acima do limite atual');
    expect(screen.getByText('Galeria (16/15)')).toBeTruthy();
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
});
