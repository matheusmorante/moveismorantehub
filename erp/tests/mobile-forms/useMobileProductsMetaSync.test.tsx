// @vitest-environment happy-dom
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  fetchPage: vi.fn(),
  saveProduct: vi.fn(),
  syncMeta: vi.fn(),
}));

vi.mock('react-native', () => ({ Alert: { alert: vi.fn() } }));
vi.mock('../../../mobile/src/features/products/services/mobileProductFetchService', () => ({
  fetchMobileProductsPage: mocks.fetchPage,
}));
vi.mock('../../../mobile/src/features/products/services/mobileProductMutationService', () => ({
  deleteMobileProduct: vi.fn(),
  moveMobileProductToTrash: vi.fn(),
  restoreMobileProductFromTrash: vi.fn(),
  saveMobileProduct: mocks.saveProduct,
  toggleMobileProductActive: vi.fn(),
  toggleMobileProductCatalog: vi.fn(),
}));
vi.mock('../../../mobile/src/features/products/services/mobileProductMetaCatalogSyncService', () => ({
  triggerMobileProductMetaCatalogSync: mocks.syncMeta,
}));
vi.mock('../../../mobile/src/features/products/services/mobileProductTechnicalService', () => ({
  fetchMobileProductTechnicalFields: vi.fn(),
}));

import { useMobileProducts } from '../../../mobile/src/features/products/hooks/useMobileProducts';

const renderDisabledProductList = () =>
  renderHook(() => useMobileProducts('standard', false));

describe('useMobileProducts: sincronização Meta depois de salvar', () => {
  beforeEach(() => {
    mocks.fetchPage.mockReset();
    mocks.saveProduct.mockReset().mockResolvedValue('persisted-product-id');
    mocks.syncMeta.mockReset();
  });
  afterEach(cleanup);

  it.each([
    ['isDraft', { isDraft: true }],
    ['is_draft', { is_draft: true }],
    ['status', { status: 'draft' }],
  ])('não agenda sincronização externa para rascunho identificado por %s', async (_source, marker) => {
    const product = { id: 'product-draft', ...marker };
    const { result } = renderDisabledProductList();

    await act(async () => {
      await result.current.handleSave(product);
    });

    expect(mocks.saveProduct).toHaveBeenCalledWith(product);
    expect(mocks.syncMeta).not.toHaveBeenCalled();
    expect(mocks.fetchPage).not.toHaveBeenCalled();
  });

  it.each(['published', 'hidden'] as const)(
    'agenda sincronização após salvar um produto concluído com status %s',
    async (status) => {
      const product = { id: 'product-complete', isDraft: false, status };
      const { result } = renderDisabledProductList();

      await act(async () => {
        await result.current.handleSave(product);
      });

      expect(mocks.saveProduct).toHaveBeenCalledWith(product);
      expect(mocks.syncMeta).toHaveBeenCalledOnce();
      expect(mocks.syncMeta).toHaveBeenCalledWith('persisted-product-id');
      expect(mocks.fetchPage).not.toHaveBeenCalled();
    }
  );

  it('mantém o autosave versionado separado da sincronização Meta', async () => {
    const draft = { id: 'product-draft', status: 'draft' };
    mocks.saveProduct.mockResolvedValueOnce('version-ack');
    const { result } = renderDisabledProductList();
    let acknowledgement: unknown;

    await act(async () => {
      acknowledgement = await result.current.handleAutoSave(draft);
    });

    expect(acknowledgement).toBe('version-ack');
    expect(mocks.saveProduct).toHaveBeenCalledWith(draft, {
      returnVersionAcknowledgement: true,
    });
    expect(mocks.syncMeta).not.toHaveBeenCalled();
    expect(mocks.fetchPage).not.toHaveBeenCalled();
  });
});
