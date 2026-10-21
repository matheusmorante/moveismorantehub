// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
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

describe('ProductVariationsTab and protected deletion', () => {
  beforeEach(() => {
    cleanup();
    mocks.checkVariationIsUsed.mockReset();
  });

  it('shows one locked variation without rendering the product mode control here', () => {
    render(
      <ProductVariationsTab
        formData={{ name: 'Mesa', hasVariations: false, images: ['https://img.test/mesa.jpg'] }}
        variations={[makeVariation('1', 'Mesa')]}
        isExistingProduct={false}
      />
    );

    expect(screen.queryByRole('switch', { name: 'Tipo do produto' })).toBeNull();
    expect(screen.queryByText('Tipo do produto')).toBeNull();
    expect((screen.getByRole('button', { name: 'Editar características da variação' }) as HTMLButtonElement).disabled).toBe(true);
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
