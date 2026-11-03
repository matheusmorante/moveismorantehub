import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  fetchMobileProductsPage: vi.fn(),
}));

vi.mock('../../supabaseClient', () => ({ supabase: { from: mocks.from } }));
vi.mock('../../../features/products/services/mobileProductFetchService', () => ({
  fetchMobileProductsPage: mocks.fetchMobileProductsPage,
}));

import {
  fetchInboundInvoiceProductForEdit,
  searchInboundInvoiceProductParents,
  searchInboundInvoiceProducts,
} from './inboundInvoiceCatalogLookupService';

const SUPPLIER_ID = '00000000-0000-4000-8000-000000000001';

const createQuery = (result: { data: any; error: any }) => {
  const query: any = {};
  for (const method of ['select', 'eq', 'not', 'filter', 'or', 'order', 'limit']) {
    query[method] = vi.fn(() => query);
  }
  query.maybeSingle = vi.fn().mockResolvedValue(result);
  query.single = vi.fn().mockResolvedValue(result);
  query.then = (resolve: (value: typeof result) => unknown, reject?: (reason: unknown) => unknown) =>
    Promise.resolve(result).then(resolve, reject);
  return query;
};

describe('inbound invoice catalog lookup', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('applies supplier scope and excludes products already linked in the invoice', async () => {
    mocks.fetchMobileProductsPage.mockResolvedValue({
      total: 1,
      data: [
        {
          id: 'parent-1',
          name: 'Guarda Roupa',
          code: 'GR-01',
          unitPrice: 800,
          allVariations: [
            { id: 'variation-1', name: 'Guarda Roupa Branco', sku: 'GR-01-BR', active: true, unitPrice: 800 },
            { id: 'variation-2', name: 'Guarda Roupa Grafite', sku: 'GR-01-GF', active: true, unitPrice: 820 },
            { id: 'variation-3', name: 'Guarda Roupa Preto', sku: 'GR-01-PR', active: false, unitPrice: 830 },
            { id: 'variation-4', name: 'Guarda Roupa Amêndoa', sku: 'GR-01-AM', active: true, isMerged: true, unitPrice: 830 },
          ],
        },
      ],
    });

    const results = await searchInboundInvoiceProducts('guarda roupa', SUPPLIER_ID, [
      { productId: 'parent-1', variationId: 'variation-1' },
    ]);

    expect(mocks.fetchMobileProductsPage).toHaveBeenCalledWith(
      1,
      6,
      expect.objectContaining({
        search: 'guarda roupa',
        supplierId: SUPPLIER_ID,
        statusFilter: 'active',
        includeMerged: false,
        throwOnError: true,
      })
    );
    expect(results.map((result) => result.variationId)).toEqual(['variation-2']);
    expect(results).toHaveLength(1);
  });

  it('fails closed when a product search has no confirmed supplier', async () => {
    await expect(searchInboundInvoiceProducts('mesa', '')).rejects.toThrow();
    expect(mocks.fetchMobileProductsPage).not.toHaveBeenCalled();
  });

  it('restricts parent suggestions to the selected supplier before limiting them', async () => {
    const query = createQuery({ data: [{ id: 'parent-1', product_variations: [] }], error: null });
    mocks.from.mockReturnValue(query);

    const results = await searchInboundInvoiceProductParents('guarda roupa', SUPPLIER_ID);

    expect(results).toEqual([{ id: 'parent-1', product_variations: [] }]);
    expect(query.or).toHaveBeenCalledWith(
      `supplier_id.eq.${SUPPLIER_ID},main_supplier_id.eq.${SUPPLIER_ID},supplier_ids.cs.{"${SUPPLIER_ID}"}`
    );
    expect(query.limit).toHaveBeenCalledWith(5);
  });

  it('returns complete product data for edit without changing invoice links', async () => {
    const query = createQuery({
      data: {
        id: 'parent-1',
        name: 'Guarda Roupa',
        images: [],
        product_variations: [{ id: 'variation-1', name: 'Guarda Roupa Branco' }],
        product_categories: [{ category_id: 'category-1', categories: { id: 'category-1' } }],
        product_images: [
          { image_url: 'https://example.test/secondary.jpg', is_main: false },
          { image_url: 'https://example.test/main.jpg', is_main: true },
        ],
      },
      error: null,
    });
    mocks.from.mockReturnValue(query);

    const product = await fetchInboundInvoiceProductForEdit('parent-1');

    expect(query.select).toHaveBeenCalledWith(
      '*, product_variations(*), product_categories(*, categories(*)), product_images(*)'
    );
    expect(product?.allVariations).toEqual(product?.product_variations);
    expect(product?.images).toEqual([
      'https://example.test/main.jpg',
      'https://example.test/secondary.jpg',
    ]);
  });
});
