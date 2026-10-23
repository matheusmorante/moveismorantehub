// @vitest-environment happy-dom
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useLabelProducts } from './useLabelProducts';

const mocks = vi.hoisted(() => {
  const query: any = {};
  query.select = vi.fn(() => query);
  query.eq = vi.fn(() => query);
  query.is = vi.fn(() => query);
  query.maybeSingle = vi.fn();
  return {
    query,
    from: vi.fn(() => query),
    errorToast: vi.fn(),
    row: {
      id: 'product-id',
      name: 'Camiseta',
      description: 'Camiseta Azul',
      code: 'CAM-1',
      sku: 'CAM-1-AZ',
      unit_price: 49.9,
      promo_price: 39.9,
      active: true,
      deleted_at: null,
      images: ['https://example.com/camiseta.jpg'],
    },
  };
});

vi.mock('@/pages/utils/supabaseConfig', () => ({ supabase: { from: mocks.from } }));
vi.mock('react-toastify', () => ({ toast: { error: mocks.errorToast } }));

afterEach(cleanup);
beforeEach(() => {
  vi.clearAllMocks();
  mocks.query.maybeSingle.mockResolvedValue({ data: mocks.row, error: null });
});

describe('useLabelProducts price-label deep link', () => {
  it('loads the requested product only when automatic preselection is explicit', async () => {
    const { result } = renderHook(() =>
      useLabelProducts({ productIdParam: 'product-id', autoAddProductParam: true })
    );

    await waitFor(() => expect(result.current.initialProduct?.id).toBe('product-id'));
    expect(mocks.from).toHaveBeenCalledWith('products');
    expect(mocks.query.eq).toHaveBeenCalledWith('id', 'product-id');
    expect(mocks.query.is).toHaveBeenCalledWith('deleted_at', null);
    expect(result.current.initialProduct).toMatchObject({
      description: 'Camiseta Azul',
      unitPrice: 49.9,
      promo_price: 39.9,
    });
  });

  it('does not query a product from unrelated identification-label links', async () => {
    await act(async () => {
      renderHook(() => useLabelProducts({ productIdParam: 'product-id' }));
    });

    expect(mocks.from).not.toHaveBeenCalled();
  });

  it('reports a missing linked product without returning a preselection', async () => {
    mocks.query.maybeSingle.mockResolvedValue({ data: null, error: null });
    const { result } = renderHook(() =>
      useLabelProducts({ productIdParam: 'missing-id', autoAddProductParam: true })
    );

    await waitFor(() => expect(mocks.errorToast).toHaveBeenCalledWith('Produto não encontrado para a etiqueta de preço.'));
    expect(result.current.initialProduct).toBeNull();
  });
});
