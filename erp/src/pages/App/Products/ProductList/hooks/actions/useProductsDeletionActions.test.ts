// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  bulkMoveToTrash: vi.fn(),
  bulkRestoreProducts: vi.fn(),
  deleteProduct: vi.fn(),
  toast: {
    loading: vi.fn(() => 'toast-1'),
    update: vi.fn(),
    dismiss: vi.fn(),
    warning: vi.fn(),
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('@/pages/utils/supabaseConfig', () => ({ supabase: {} }));
vi.mock('@/pages/utils/productService', () => ({
  bulkMoveToTrash: mocks.bulkMoveToTrash,
  bulkRestoreProducts: mocks.bulkRestoreProducts,
  deleteProduct: mocks.deleteProduct,
}));
vi.mock('react-toastify', () => ({ toast: mocks.toast }));

import {
  executeBulkRestore,
  executeBulkPermanentDelete,
  executeBulkTrash,
} from './useProductsDeletionActions';

afterEach(() => {
  vi.restoreAllMocks();
  vi.clearAllMocks();
});

describe('useProductsDeletionActions query invalidation', () => {
  it('delega a invalidação da restauração em lote ao serviço', async () => {
    mocks.bulkRestoreProducts.mockResolvedValue(undefined);
    const removeRestoredProductsFromTrash = vi.fn();
    const setSelectedProducts = vi.fn();
    const setLoading = vi.fn();

    await executeBulkRestore(
      ['product-1'],
      removeRestoredProductsFromTrash,
      setSelectedProducts,
      setLoading
    );

    expect(mocks.bulkRestoreProducts).toHaveBeenCalledWith(['product-1']);
    expect(removeRestoredProductsFromTrash).toHaveBeenCalledWith(['product-1']);
    expect(setSelectedProducts).toHaveBeenCalledWith([]);
    expect(setLoading).toHaveBeenLastCalledWith(false);
    expect(mocks.toast.success).toHaveBeenCalledOnce();
  });

  it('relies on the bulk service invalidation for trash and keeps partial results visible', async () => {
    mocks.bulkMoveToTrash.mockResolvedValue({
      successCount: 1,
      errorCount: 1,
      errors: ['Produto vinculado a um pedido'],
      deactivatedIds: ['product-1'],
    });
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const setSelectedProducts = vi.fn();
    const setLoading = vi.fn();

    await executeBulkTrash(['product-1', 'product-2'], setSelectedProducts, setLoading);

    expect(mocks.bulkMoveToTrash).toHaveBeenCalledWith(['product-1', 'product-2']);
    expect(setSelectedProducts).toHaveBeenCalledWith([]);
    expect(setLoading).toHaveBeenNthCalledWith(1, true);
    expect(setLoading).toHaveBeenLastCalledWith(false);
    expect(mocks.toast.warning).toHaveBeenCalledWith('Produto vinculado a um pedido');
  });

  it('defers per-product invalidation and refreshes once after the permanent-delete batch', async () => {
    mocks.deleteProduct
      .mockResolvedValueOnce({ success: true })
      .mockResolvedValueOnce({ success: false, message: 'Produto em uso' });
    const refresh = vi.fn();
    const setSelectedProducts = vi.fn();
    const setLoading = vi.fn();

    await executeBulkPermanentDelete(['product-1', 'product-2'], refresh, setSelectedProducts, setLoading);

    expect(mocks.deleteProduct).toHaveBeenNthCalledWith(1, 'product-1', {
      deferQueryInvalidation: true,
    });
    expect(mocks.deleteProduct).toHaveBeenNthCalledWith(2, 'product-2', {
      deferQueryInvalidation: true,
    });
    expect(refresh).toHaveBeenCalledOnce();
    expect(setSelectedProducts).toHaveBeenCalledWith([]);
  });
});
