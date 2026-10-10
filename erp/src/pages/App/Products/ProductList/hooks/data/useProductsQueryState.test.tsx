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
});
