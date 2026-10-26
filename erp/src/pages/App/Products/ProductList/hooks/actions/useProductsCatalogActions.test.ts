import { beforeEach, describe, expect, it, vi } from 'vitest';

const updateProduct = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const supabaseFrom = vi.hoisted(() => vi.fn());
const triggerProductMetaCatalogSync = vi.hoisted(() => vi.fn());

vi.mock('@/pages/utils/supabaseConfig', () => ({ supabase: { from: supabaseFrom } }));
vi.mock('@/pages/utils/productService', () => ({ updateProduct }));
vi.mock('@/pages/utils/productService/productMetaCatalogSync', () => ({
  triggerProductMetaCatalogSync,
}));

import { persistCatalogStatus } from './useProductsCatalogActions';

beforeEach(() => {
  vi.clearAllMocks();
  updateProduct.mockResolvedValue(undefined);
});

const createVariationHideQueries = (
  events: string[],
  remainingVariationsResult: { data: Array<{ id: string }> | null; error: unknown | null }
) => {
  const variationQuery: any = {};
  variationQuery.update = vi.fn(() => variationQuery);
  variationQuery.select = vi.fn(() => variationQuery);
  variationQuery.eq = vi.fn((column: string) => {
    if (column === 'id') {
      events.push('variation-write');
      return Promise.resolve({ error: null });
    }
    if (column === 'status') {
      events.push('remaining-variations-read');
      return Promise.resolve(remainingVariationsResult);
    }
    return variationQuery;
  });
  variationQuery.neq = vi.fn(() => variationQuery);

  const productQuery: any = {};
  productQuery.update = vi.fn(() => productQuery);
  productQuery.eq = vi.fn(() => {
    events.push('parent-write');
    return Promise.resolve({ error: null });
  });

  supabaseFrom.mockImplementation((table: string) =>
    table === 'products' ? productQuery : variationQuery
  );

  return { productQuery, variationQuery };
};

describe('persistCatalogStatus query invalidation', () => {
  it('adia a invalidação para o wrapper da lista', async () => {
    await persistCatalogStatus('legacy-product', 'hidden', { id: 'legacy-product' } as any);

    expect(updateProduct).toHaveBeenCalledWith(
      'legacy-product',
      { status: 'hidden' },
      { deferQueryInvalidation: true }
    );
  });

  it('interrompe a ocultação do pai quando falha a consulta de irmãs publicadas', async () => {
    const events: string[] = [];
    const queryError = new Error('falha ao consultar variações');
    const { productQuery } = createVariationHideQueries(events, {
      data: null,
      error: queryError,
    });

    await expect(
      persistCatalogStatus(
        '123e4567-e89b-42d3-a456-426614174000',
        'hidden',
        { id: '123e4567-e89b-42d3-a456-426614174000' } as any,
        { id: '123e4567-e89b-42d3-a456-426614174001' }
      )
    ).rejects.toBe(queryError);

    expect(events).toEqual(['variation-write', 'remaining-variations-read']);
    expect(productQuery.update).not.toHaveBeenCalled();
    expect(triggerProductMetaCatalogSync).not.toHaveBeenCalled();
  });

  it('sincroniza Meta somente depois da variação, consulta de irmãs e pai persistirem', async () => {
    const events: string[] = [];
    const { productQuery } = createVariationHideQueries(events, {
      data: [],
      error: null,
    });
    triggerProductMetaCatalogSync.mockImplementation(() => events.push('meta-sync'));

    await persistCatalogStatus(
      '123e4567-e89b-42d3-a456-426614174000',
      'hidden',
      { id: '123e4567-e89b-42d3-a456-426614174000' } as any,
      { id: '123e4567-e89b-42d3-a456-426614174001' }
    );

    expect(events).toEqual([
      'variation-write',
      'remaining-variations-read',
      'parent-write',
      'meta-sync',
    ]);
    expect(productQuery.update).toHaveBeenCalledWith({ status: 'hidden' });
    expect(triggerProductMetaCatalogSync).toHaveBeenCalledWith(
      '123e4567-e89b-42d3-a456-426614174000'
    );
  });
});
