import { beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryClient } from '@tanstack/react-query';

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  applyProductFiltersAndSort: vi.fn(),
  queryError: new Error('falha de leitura'),
}));

vi.mock('@/pages/utils/supabaseConfig', () => ({
  supabase: { from: mocks.from },
  ecommerceSupabase: { from: mocks.from },
}));
vi.mock('../productService/productFilterBuilder', () => ({
  applyProductFiltersAndSort: mocks.applyProductFiltersAndSort,
}));
vi.mock('../productService/productMapper', () => ({ mapFromDB: vi.fn() }));
vi.mock('../productService/productLocalCache', () => ({
  getLocalProducts: vi.fn(() => []),
  saveLocalProducts: vi.fn(),
}));
vi.mock('../productService/productSkuService', () => ({ TABLE_NAME: 'products' }));
vi.mock('../productService/productAnalyticsQueryService', () => ({
  searchHistoricalItems: vi.fn(),
  getProductSalesStats: vi.fn(),
}));
vi.mock('../personService/personMapper', () => ({
  TABLE_NAME: 'people',
  mapFromDB: vi.fn((person) => person),
}));
vi.mock('../personService/personSyncService', () => ({ syncMissingEmployeesFromProfiles: vi.fn() }));
vi.mock('@/lib/queryClient', () => ({ queryClient: { invalidateQueries: vi.fn() } }));

import { fetchProductsPage } from '../productService/productQueryService';
import { mapFromDB } from '../productService/productMapper';
import { fetchPersons } from '../personService/personQueryService';
import { fetchVariations } from '../variationService';

const failedQueryChain = () => {
  const chain: any = {
    select: vi.fn(() => chain),
    or: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    order: vi.fn(() => chain),
    range: vi.fn(() => Promise.resolve({ data: null, error: mocks.queryError })),
    then: (resolve: (value: unknown) => unknown) =>
      Promise.resolve({ data: null, error: mocks.queryError }).then(resolve),
  };
  return chain;
};

describe('list query service error propagation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    mocks.from.mockReturnValue(failedQueryChain());
    mocks.applyProductFiltersAndSort.mockResolvedValue({
      data: null,
      count: null,
      error: mocks.queryError,
    });
  });

  it('keeps the legacy product fallback but lets TanStack observe failures on request', async () => {
    await expect(fetchProductsPage(1, 15)).resolves.toEqual({ data: [], total: 0 });
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    await expect(
      queryClient.fetchQuery({
        queryKey: ['products', 1],
        queryFn: () => fetchProductsPage(1, 15, undefined, { throwOnError: true }),
      })
    ).rejects.toBe(mocks.queryError);
    expect(queryClient.getQueryState(['products', 1])?.status).toBe('error');
  });

  it('preserves supplier matches from main_supplier_id and the database total', async () => {
    const supplierOnlyProduct = {
      id: 'main-supplier-product',
      supplier_id: null,
      main_supplier_id: 'supplier-1',
      supplier_ids: [],
    };
    mocks.applyProductFiltersAndSort.mockResolvedValue({
      data: [supplierOnlyProduct],
      count: 37,
      error: null,
    });
    vi.mocked(mapFromDB).mockImplementation((row) => row as any);

    const result = await fetchProductsPage(2, 15, { supplierId: 'supplier-1' });

    expect(result.data).toEqual([supplierOnlyProduct]);
    expect(result.total).toBe(37);
  });

  it('keeps the legacy people fallback but lets TanStack observe failures on request', async () => {
    await expect(fetchPersons('customers')).resolves.toEqual([]);
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    await expect(
      queryClient.fetchQuery({
        queryKey: ['people', 'customers'],
        queryFn: () => fetchPersons('customers', false, { throwOnError: true }),
      })
    ).rejects.toBe(mocks.queryError);
    expect(queryClient.getQueryState(['people', 'customers'])?.status).toBe('error');
  });

  it('keeps the variation subscriber fallback but lets TanStack observe failures on request', async () => {
    await expect(fetchVariations()).resolves.toEqual([]);
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    await expect(
      queryClient.fetchQuery({
        queryKey: ['variations'],
        queryFn: () => fetchVariations({ throwOnError: true }),
      })
    ).rejects.toBe(mocks.queryError);
    expect(queryClient.getQueryState(['variations'])?.status).toBe('error');
  });
});
