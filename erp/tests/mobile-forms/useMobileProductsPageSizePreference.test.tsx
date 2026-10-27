// @vitest-environment happy-dom
import { cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  fetchProducts: vi.fn(),
  readPreference: vi.fn(),
  writePreference: vi.fn(),
}));

vi.mock('react-native', () => ({ Alert: { alert: vi.fn() } }));
vi.mock('../../../mobile/src/features/products/domain/mobileProductPageSizePreference', () => ({
  getMobileProductPageSizePreferenceKey: (userId: string | null | undefined, mode: string) =>
    userId ? `@morantehub:products:page-size:${userId}:${mode}` : null,
  readMobileProductPageSizePreference: mocks.readPreference,
  writeMobileProductPageSizePreference: mocks.writePreference,
}));
vi.mock('../../../mobile/src/features/products/services/mobileProductFetchService', () => ({
  fetchMobileProductsPage: mocks.fetchProducts,
}));
vi.mock('../../../mobile/src/features/products/services/mobileProductTechnicalService', () => ({
  fetchMobileProductTechnicalFields: vi.fn(),
}));
vi.mock('../../../mobile/src/features/products/services/mobileProductMutationService', () => ({
  deleteMobileProduct: vi.fn(),
  moveMobileProductToTrash: vi.fn(),
  restoreMobileProductFromTrash: vi.fn(),
  saveMobileProduct: vi.fn(),
  toggleMobileProductActive: vi.fn(),
  toggleMobileProductCatalog: vi.fn(),
}));
vi.mock('../../../mobile/src/features/products/services/mobileProductMetaCatalogSyncService', () => ({
  triggerMobileProductMetaCatalogSync: vi.fn(),
}));

import { useMobileProducts } from '../../../mobile/src/features/products/hooks/useMobileProducts';

describe('useMobileProducts page-size preference', () => {
  beforeEach(() => {
    mocks.fetchProducts.mockReset().mockResolvedValue({ data: [], total: 0 });
    mocks.readPreference.mockReset().mockResolvedValue(30);
    mocks.writePreference.mockReset().mockResolvedValue(undefined);
  });
  afterEach(cleanup);

  it('aguarda a preferência do usuário antes da primeira consulta da lista', async () => {
    const { result, rerender } = renderHook(
      ({ userId, identityReady }: { userId: string | null; identityReady: boolean }) =>
        useMobileProducts('standard', true, false, false, userId, identityReady),
      { initialProps: { userId: null, identityReady: false } },
    );
    expect(mocks.fetchProducts).not.toHaveBeenCalled();

    rerender({ userId: 'user-1', identityReady: true });

    await waitFor(() => expect(mocks.readPreference).toHaveBeenCalledWith(
      '@morantehub:products:page-size:user-1:standard',
    ));
    await waitFor(() => expect(mocks.fetchProducts).toHaveBeenCalled());
    expect(mocks.fetchProducts.mock.calls[0][0]).toBe(1);
    expect(mocks.fetchProducts.mock.calls[0][1]).toBe(30);
    expect(result.current.itemsPerPage).toBe(30);
  });
});
