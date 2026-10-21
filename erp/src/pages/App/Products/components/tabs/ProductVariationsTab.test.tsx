// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { Variation } from '@/pages/types/product.type';
import ProductVariationsTab from './ProductVariationsTab';

const mocks = vi.hoisted(() => ({ checkVariationIsUsed: vi.fn() }));

vi.mock('@/pages/utils/productService', () => ({
  checkVariationIsUsed: mocks.checkVariationIsUsed,
}));

const makeVariation = (id: string, name: string): Variation => ({
  id,
  name,
  sku: `SKU-${id}`,
  stock: 1,
  unitPrice: 100,
  active: false,
  attributes: [],
  images: [],
});

describe('ProductVariationsTab product mode and protected deletion', () => {
  beforeEach(() => {
    cleanup();
    mocks.checkVariationIsUsed.mockReset();
  });

  it('shows one locked variation in creation simple mode', () => {
    render(
      <ProductVariationsTab
        formData={{ name: 'Mesa', hasVariations: false, images: ['https://img.test/mesa.jpg'] }}
        variations={[makeVariation('1', 'Mesa')]}
        isExistingProduct={false}
      />
    );

    const simpleButton = screen.getAllByRole('button', { name: /Produto Simples/ })[0];
    expect(simpleButton.getAttribute('aria-pressed')).toBe('true');
    expect((screen.getByRole('button', { name: 'Editar características da variação' }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('shows the automatic-simple tooltip when the option is clicked with multiple variations', () => {
    render(
      <ProductVariationsTab
        formData={{ name: 'Mesa', hasVariations: true }}
        variations={[makeVariation('1', 'Mesa Carvalho'), makeVariation('2', 'Mesa Nogueira')]}
      />
    );

    fireEvent.click(screen.getAllByRole('button', { name: /Produto Simples/ })[0]);

    expect(screen.getByRole('tooltip').textContent).toContain(
      'Este produto se tornará simples automaticamente quando restar apenas 1 variação.'
    );
  });

  it('shows the disabled-option tooltip when focused from the keyboard', () => {
    render(
      <ProductVariationsTab
        formData={{ name: 'Mesa', hasVariations: true }}
        variations={[makeVariation('1', 'Mesa Carvalho'), makeVariation('2', 'Mesa Nogueira')]}
      />
    );

    fireEvent.focus(screen.getAllByRole('button', { name: /Produto Simples/ })[0]);

    expect(screen.getByRole('tooltip').textContent).toContain(
      'Este produto se tornará simples automaticamente quando restar apenas 1 variação.'
    );
  });

  it('disables only the conventional variation linked to stock or sales', async () => {
    mocks.checkVariationIsUsed
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(true);
    render(
      <ProductVariationsTab
        formData={{ name: 'Mesa', productKind: 'normal', hasVariations: true }}
        variations={[makeVariation('1', 'Mesa Carvalho'), makeVariation('2', 'Mesa Nogueira')]}
        isRegisteredProduct
        isExistingProduct
        isConventionalProduct
        onDeleteVariation={vi.fn()}
      />
    );

    await waitFor(() => {
      expect((screen.getByRole('button', { name: 'Excluir variação SKU-1' }) as HTMLButtonElement).disabled).toBe(false);
      expect((screen.getByRole('button', { name: 'Excluir variação SKU-2' }) as HTMLButtonElement).disabled).toBe(true);
    });
  });
});
