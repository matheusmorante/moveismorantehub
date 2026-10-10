// @vitest-environment happy-dom
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ fetchProductsPage: vi.fn() }));

vi.mock('@/context/AuthContext', () => ({ useAuth: () => ({ profile: null }) }));
vi.mock('@/pages/utils/productService', () => ({
  fetchProductsPage: mocks.fetchProductsPage,
  activateProduct: vi.fn(),
}));
vi.mock('react-toastify', () => ({ toast: { error: vi.fn(), success: vi.fn(), info: vi.fn() } }));
vi.mock('@/pages/utils/permissionService', () => ({ canPerform: () => false }));
vi.mock('@/pages/utils/accessRoles', () => ({ getProfileRoles: () => [] }));
vi.mock('@/pages/utils/hmlTestData', () => ({ isTestProduct: () => false }));
vi.mock('../../utils/catalog/productListTransformers', () => ({
  flattenProductsForList: (products: unknown[]) => products,
}));
vi.mock('../../utils/selection/productSelection', () => ({ toggleProductSelection: vi.fn() }));
vi.mock('../../utils/activation/productActivationState', () => ({
  updateProductActivationState: vi.fn(),
}));
vi.mock('../../utils/catalog/productCatalogState', () => ({ updateProductCatalogState: vi.fn() }));
vi.mock('../productQueryMutations', () => ({ persistAndInvalidateProductList: vi.fn() }));
vi.mock('../activation/useProductsActivationValidation', () => ({
  validateErpActivationRequirements: vi.fn(),
}));
vi.mock('../activation/useProductsActivePersistence', () => ({ persistProductActiveState: vi.fn() }));
vi.mock('../actions/useProductsCatalogActions', () => ({
  resolveCatalogEntities: vi.fn(),
  validateCatalogPublication: vi.fn(),
  persistCatalogStatus: vi.fn(),
}));
vi.mock('../actions/useProductsDeletionActions', () => ({
  discardProductDraft: vi.fn(),
  deactivateSingleProduct: vi.fn(),
  deleteProductPermanently: vi.fn(),
  executeBulkTrash: vi.fn(),
  executeBulkRestore: vi.fn(),
  executeBulkPermanentDelete: vi.fn(),
}));

import { useProducts } from './useProducts';

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('useProducts query snapshot', () => {
  const createWrapper = () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: 0 } },
    });
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    return wrapper;
  };

  it('clears the previous filter result when a new list query fails', async () => {
    const wrapper = createWrapper();
    mocks.fetchProductsPage
      .mockResolvedValueOnce({ data: [{ id: 'product-from-old-filter', variations: [] }], total: 1 })
      .mockRejectedValueOnce(new Error('falha na nova consulta'));

    const { result, rerender } = renderHook(
      ({ search }: { search: string }) => useProducts({ search }),
      { initialProps: { search: '' }, wrapper }
    );

    await waitFor(() => expect(result.current.products.map((product) => product.id)).toEqual(['product-from-old-filter']));

    rerender({ search: 'novo-filtro' });

    await waitFor(() => expect(result.current.error).toBeTruthy());
    expect(result.current.products).toEqual([]);
    expect(result.current.totalItems).toBe(0);
  });

  it('keeps cached results visible when a refetch for the same filter fails', async () => {
    const wrapper = createWrapper();
    mocks.fetchProductsPage
      .mockResolvedValueOnce({ data: [{ id: 'cached-product', variations: [] }], total: 1 })
      .mockRejectedValueOnce(new Error('falha no refetch'));
    const { result } = renderHook(() => useProducts({ search: 'cache' }), { wrapper });

    await waitFor(() => expect(result.current.products.map((product) => product.id)).toEqual(['cached-product']));
    await act(async () => { await result.current.refresh(); });
    await waitFor(() => expect(result.current.error).toBeTruthy());

    expect(result.current.products.map((product) => product.id)).toEqual(['cached-product']);
  });

  it('does not show a previous filter snapshot while the new query is loading', async () => {
    let resolveNextQuery!: (value: { data: { id: string; variations: never[] }[]; total: number }) => void;
    mocks.fetchProductsPage
      .mockResolvedValueOnce({ data: [{ id: 'old-filter-product', variations: [] }], total: 1 })
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveNextQuery = resolve;
          })
      );

    const { result, rerender } = renderHook(
      ({ search }: { search: string }) => useProducts({ search }),
      { initialProps: { search: '' }, wrapper: createWrapper() }
    );

    await waitFor(() => expect(result.current.products[0]?.id).toBe('old-filter-product'));
    rerender({ search: 'novo-filtro' });
    await waitFor(() => expect(mocks.fetchProductsPage).toHaveBeenCalledTimes(2));

    expect(result.current.products).toEqual([]);
    expect(result.current.totalItems).toBe(0);

    await act(async () => {
      resolveNextQuery({ data: [{ id: 'new-filter-product', variations: [] }], total: 1 });
    });
    await waitFor(() => expect(result.current.products[0]?.id).toBe('new-filter-product'));
  });

  it('recovers the product list when refresh retries a failed query', async () => {
    mocks.fetchProductsPage
      .mockRejectedValueOnce(new Error('falha temporária'))
      .mockResolvedValueOnce({ data: [{ id: 'recovered-product', variations: [] }], total: 1 });
    const { result } = renderHook(() => useProducts({ search: 'retry' }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.error).toBeTruthy());
    expect(result.current.products).toEqual([]);

    act(() => {
      result.current.refresh();
    });
    await waitFor(() =>
      expect(result.current.products.map((product) => product.id)).toEqual(['recovered-product'])
    );
    expect(result.current.error).toBeNull();
  });

  it('starts filtered queries on page one without requesting the old page first', async () => {
    mocks.fetchProductsPage.mockResolvedValue({ data: [], total: 40 });
    const { result, rerender } = renderHook(
      ({ search }: { search: string }) => useProducts({ search }),
      { initialProps: { search: '' }, wrapper: createWrapper() }
    );

    await waitFor(() => expect(mocks.fetchProductsPage).toHaveBeenCalledTimes(1));
    act(() => result.current.setCurrentPage(3));
    await waitFor(() => expect(mocks.fetchProductsPage).toHaveBeenCalledTimes(2));

    mocks.fetchProductsPage.mockClear();
    rerender({ search: 'acabamento' });

    await waitFor(() => expect(mocks.fetchProductsPage).toHaveBeenCalledTimes(1));
    expect(mocks.fetchProductsPage).toHaveBeenCalledWith(
      1,
      15,
      expect.objectContaining({ search: 'acabamento' }),
      { throwOnError: true }
    );
  });

  it('includes test-product visibility in the query key and server filter', async () => {
    mocks.fetchProductsPage.mockResolvedValue({ data: [], total: 0 });
    const { rerender } = renderHook(
      ({ showTestProducts }: { showTestProducts: boolean }) =>
        useProducts({ showTestProducts }),
      { initialProps: { showTestProducts: true }, wrapper: createWrapper() }
    );

    await waitFor(() => expect(mocks.fetchProductsPage).toHaveBeenCalledTimes(1));
    expect(mocks.fetchProductsPage.mock.calls[0][2]).toEqual(
      expect.objectContaining({ excludeTestProducts: false })
    );

    rerender({ showTestProducts: false });

    await waitFor(() => expect(mocks.fetchProductsPage).toHaveBeenCalledTimes(2));
    expect(mocks.fetchProductsPage.mock.calls[1][2]).toEqual(
      expect.objectContaining({ excludeTestProducts: true })
    );
  });

  it('clamps the current page when a refresh reduces the available page count', async () => {
    let total = 20;
    const createPage = (page: number, pageSize: number) => {
      const start = (page - 1) * pageSize;
      return Array.from({ length: Math.max(0, Math.min(pageSize, total - start)) }, (_, index) => ({
        id: `product-${start + index + 1}`,
        variations: [],
      }));
    };
    mocks.fetchProductsPage.mockImplementation(async (page: number, pageSize: number) => ({
      data: createPage(page, pageSize),
      total,
    }));
    const { result } = renderHook(() => useProducts({}), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.totalItems).toBe(20));
    act(() => result.current.setCurrentPage(2));
    await waitFor(() => expect(result.current.currentPage).toBe(2));
    await waitFor(() => expect(result.current.products[0]?.id).toBe('product-16'));

    total = 5;
    act(() => result.current.refresh());

    await waitFor(() => {
      expect(result.current.currentPage).toBe(1);
      expect(result.current.totalItems).toBe(5);
      expect(result.current.products).toHaveLength(5);
    });
    expect(result.current.products[0]?.id).toBe('product-1');
  });
});
