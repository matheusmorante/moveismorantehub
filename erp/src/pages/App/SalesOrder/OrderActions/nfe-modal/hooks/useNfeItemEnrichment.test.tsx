// @vitest-environment happy-dom
import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useNfeItemEnrichment } from './useNfeItemEnrichment';

const mocks = vi.hoisted(() => ({
  prepareHmlItemCsosns: vi.fn(),
  toastError: vi.fn(),
  toastInfo: vi.fn(),
}));

vi.mock('@/pages/utils/nfe/csosnConfigurationService', () => ({
  prepareHmlItemCsosns: mocks.prepareHmlItemCsosns,
}));
vi.mock('@/pages/utils/settingsService', () => ({
  getSettings: () => ({ companyUF: 'PR', companyCRT: '1', fiscalDefaults: { cst: '103' } }),
}));
vi.mock('react-toastify', () => ({
  toast: { error: mocks.toastError, info: mocks.toastInfo },
}));
vi.mock('../../../../../../../../src/telemetry/nfeEmissionPerformance', () => ({
  withNfeEmissionStage: (_stage: string, operation: () => unknown) => operation(),
}));

describe('preparação fiscal dos itens da emissão', () => {
  afterEach(() => vi.resetAllMocks());

  it('usa o CSOSN do snapshot e não consulta preparação HML quando ele já existe', async () => {
    const order = {
      id: 'order-with-fiscal-snapshot',
      shipping: { deliveryMethod: 'pickup' },
      items: [
        {
          productId: 'product-1',
          description: 'Produto do pedido',
          quantity: 1,
          fiscalSnapshotVersion: 1,
          fiscal: {
            ncm: '94036000',
            cest: '',
            cfop: '5102',
            cst: '102',
            origem: '0',
            commercialUnit: 'UN',
            taxableUnit: 'UN',
          },
        },
      ],
    } as any;
    const manualFiscalFields = { current: new Map() };

    const { result } = renderHook(() =>
      useNfeItemEnrichment({
        order,
        environment: 2,
        model: '55',
        manualFiscalFields,
      })
    );

    await waitFor(() => expect(result.current.isLoadingFiscalData).toBe(false));

    expect(mocks.prepareHmlItemCsosns).not.toHaveBeenCalled();
    expect(result.current.fiscalPreparationError).toBeNull();
    expect(result.current.nfeItems[0].fiscal.cst).toBe('102');
  });

  it('não aplica o padrão CSOSN de modelo 55 a um item NFC-e sem CSOSN salvo', async () => {
    const order = {
      id: 'order-without-nfce-csosn',
      shipping: { deliveryMethod: 'pickup' },
      items: [
        {
          productId: 'product-2',
          description: 'Produto NFC-e',
          quantity: 1,
          fiscalSnapshotVersion: 1,
          fiscal: {
            ncm: '94036000',
            cest: '',
            cfop: '5102',
            origem: '0',
            commercialUnit: 'UN',
            taxableUnit: 'UN',
          },
        },
      ],
    } as any;
    const manualFiscalFields = { current: new Map() };

    const { result } = renderHook(() =>
      useNfeItemEnrichment({
        order,
        environment: 2,
        model: '65',
        manualFiscalFields,
      })
    );

    await waitFor(() => expect(result.current.isLoadingFiscalData).toBe(false));

    expect(mocks.prepareHmlItemCsosns).not.toHaveBeenCalled();
    expect(result.current.nfeItems[0].fiscal.cst).toBe('');
  });
});
