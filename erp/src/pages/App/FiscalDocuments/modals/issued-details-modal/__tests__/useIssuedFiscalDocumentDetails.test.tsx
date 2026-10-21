// @vitest-environment happy-dom
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type Order from '@/pages/types/order.type';
import { useIssuedFiscalDocumentDetails } from '../useIssuedFiscalDocumentDetails';

const mocks = vi.hoisted(() => ({
  fetchDetails: vi.fn(),
  createShareFile: vi.fn(),
  fetchOrder: vi.fn(),
}));

vi.mock('@/pages/App/FiscalDocuments/services/fiscalDocumentsService', () => ({
  fetchFiscalDocumentDetails: mocks.fetchDetails,
}));
vi.mock('@/pages/App/FiscalDocuments/services/fiscalDanfeXmlService', () => ({
  createDanfeShareFile: mocks.createShareFile,
  downloadXml: vi.fn(),
  printDanfe: vi.fn(),
}));
vi.mock('@/pages/utils/orderHistoryService', () => ({ fetchOrderById: mocks.fetchOrder }));
vi.mock('react-toastify', () => ({ toast: { error: vi.fn(), info: vi.fn() } }));

describe('useIssuedFiscalDocumentDetails reemission action', () => {
  const order = { id: 'order-7242' } as Order;

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.fetchOrder.mockResolvedValue(order);
    mocks.createShareFile.mockResolvedValue(null);
    mocks.fetchDetails.mockResolvedValue({
      document: {
        id: 'reversal-733',
        order_id: order.id,
        ambiente: 2,
        document_type: 'estorno',
        status: 'homologada',
        modelo: '65',
        numero_nfe: 733,
        xml_nfe: null,
      },
      parsedXml: null,
      events: [],
      operationDrafts: [],
      linkedDocuments: [],
      orderEmissions: [],
      fiscalSituation: {
        status: 'reissue_required',
        actionKind: 'awaiting_new_invoice',
        environment: 2,
        orderCancelled: false,
        previousDocumentId: 'original-655',
      },
    });
  });

  it('encaminha a identidade da NFC-e estornada ao iniciar nova emissão', async () => {
    const onIssueNfe = vi.fn();
    const onClose = vi.fn();
    const { result } = renderHook(() =>
      useIssuedFiscalDocumentDetails({
        documentId: 'reversal-733',
        initialEnvironment: 2,
        onIssueNfe,
        onClose,
      })
    );

    await waitFor(() => expect(result.current.details?.fiscalSituation?.previousDocumentId).toBe('original-655'));
    await act(async () => {
      await result.current.handleExecuteSituationAction('awaiting_new_invoice');
    });

    expect(mocks.fetchOrder).toHaveBeenCalledWith(order.id);
    expect(onIssueNfe).toHaveBeenCalledWith(order, 2, 'awaiting_new_invoice', 'original-655');
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
