import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  fetchOrderById: vi.fn(),
  updateOrder: vi.fn(),
  ensureOrderItemsHaveFiscalSnapshots: vi.fn(),
  findAuthorizedFiscalDocument: vi.fn(),
  fetchFiscalDocumentDetails: vi.fn(),
}));

vi.mock('../orderHistoryService', () => ({
  fetchOrderById: mocks.fetchOrderById,
  updateOrder: mocks.updateOrder,
}));
vi.mock('../orderFiscalSnapshotService', () => ({
  ensureOrderItemsHaveFiscalSnapshots: mocks.ensureOrderItemsHaveFiscalSnapshots,
}));
vi.mock('../nfe/findAuthorizedFiscalDocument', () => ({
  findAuthorizedFiscalDocument: mocks.findAuthorizedFiscalDocument,
}));
vi.mock('@/pages/App/FiscalDocuments/services/fiscalDocumentsService', () => ({
  fetchFiscalDocumentDetails: mocks.fetchFiscalDocumentDetails,
}));

import type Order from '../../types/order.type';
import { prepareOrderFiscalSnapshotForEmission } from '../nfeEmissionSnapshotService';

describe('prepareOrderFiscalSnapshotForEmission', () => {
  const legacyItem = {
    itemType: 'product',
    productId: 'product-1',
    description: 'Produto de teste',
    quantity: 1,
    unitPrice: 100,
  };
  const snapshotItem = {
    ...legacyItem,
    fiscalSnapshotVersion: 1,
    fiscal: { commercialUnit: 'UN', taxableUnit: 'UN', ncm: '94036000' },
  };
  const persistedOrder = {
    id: 'order-4787',
    updatedAt: '2026-10-08T13:20:10.716Z',
    status: 'scheduled',
    items: [legacyItem],
  } as unknown as Order;

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.fetchOrderById.mockResolvedValue(persistedOrder);
    mocks.ensureOrderItemsHaveFiscalSnapshots.mockResolvedValue([snapshotItem]);
    mocks.updateOrder.mockResolvedValue(undefined);
  });

  it('recupera do XML autorizado e não altera o pedido já vinculado à NF-e', async () => {
    mocks.findAuthorizedFiscalDocument.mockResolvedValue({
      id: 'document-hml',
      order_id: persistedOrder.id,
      status: 'homologada',
      document_type: 'outbound',
      ambiente: 2,
      modelo: '55',
    });
    mocks.fetchFiscalDocumentDetails.mockResolvedValue({
      document: {
        id: 'document-hml',
        order_id: persistedOrder.id,
        status: 'homologada',
        ambiente: 2,
        modelo: '55',
        xml_nfe: '<NFe><infNFe /></NFe>',
      },
    });

    const prepared = await prepareOrderFiscalSnapshotForEmission(persistedOrder, 2);

    expect(mocks.findAuthorizedFiscalDocument).toHaveBeenCalledWith(persistedOrder.id, {
      throwOnError: true,
      environment: 2,
    });

    expect(mocks.ensureOrderItemsHaveFiscalSnapshots).toHaveBeenCalledWith(
      persistedOrder.items,
      { xml: '<NFe><infNFe /></NFe>', status: 'homologada' }
    );
    expect(prepared.items).toEqual([snapshotItem]);
    expect(mocks.updateOrder).not.toHaveBeenCalled();
  });

  it('continua persistindo snapshot de catálogo quando não existe nota autorizada', async () => {
    mocks.findAuthorizedFiscalDocument.mockResolvedValue(null);

    const prepared = await prepareOrderFiscalSnapshotForEmission(persistedOrder, 1);

    expect(mocks.ensureOrderItemsHaveFiscalSnapshots).toHaveBeenCalledWith(
      persistedOrder.items,
      undefined
    );
    expect(mocks.updateOrder).toHaveBeenCalledWith(
      persistedOrder.id,
      { items: [snapshotItem] },
      persistedOrder,
      persistedOrder.updatedAt,
      { metadataOnly: true }
    );
    expect(prepared.items).toEqual([snapshotItem]);
  });

  it('falha fechado se não conseguir verificar a existência de nota autorizada', async () => {
    mocks.findAuthorizedFiscalDocument.mockRejectedValue(new Error('falha de leitura'));

    await expect(prepareOrderFiscalSnapshotForEmission(persistedOrder, 1)).rejects.toThrow(
      'falha de leitura'
    );
    expect(mocks.ensureOrderItemsHaveFiscalSnapshots).not.toHaveBeenCalled();
    expect(mocks.updateOrder).not.toHaveBeenCalled();
  });

  it('não usa XML autorizado de homologação para preparar produção nem altera o pedido protegido', async () => {
    const hmlOrder = {
      ...persistedOrder,
      nfeData: {
        status: 'homologada',
        environment: 2,
        xml: '<NFe><infNFe /></NFe>',
      },
    } as unknown as Order;
    mocks.fetchOrderById.mockResolvedValueOnce(hmlOrder);
    mocks.findAuthorizedFiscalDocument.mockResolvedValue(null);

    const prepared = await prepareOrderFiscalSnapshotForEmission(hmlOrder, 1);

    expect(mocks.findAuthorizedFiscalDocument).toHaveBeenCalledWith(hmlOrder.id, {
      throwOnError: true,
      environment: 1,
    });
    expect(mocks.fetchFiscalDocumentDetails).not.toHaveBeenCalled();
    expect(mocks.ensureOrderItemsHaveFiscalSnapshots).toHaveBeenCalledWith(hmlOrder.items, undefined);
    expect(mocks.updateOrder).not.toHaveBeenCalled();
    expect(prepared.items).toEqual([snapshotItem]);
  });

  it('detecta documento homologado fora do nfeData e não grava snapshots no pedido protegido', async () => {
    const homologationDocument = {
      id: 'document-hml',
      order_id: persistedOrder.id,
      status: 'homologada',
      document_type: 'outbound',
      ambiente: 2,
      modelo: '65',
    };
    mocks.findAuthorizedFiscalDocument.mockImplementation(
      async (_orderId: string, options: { environment?: number }) =>
        options.environment === undefined ? homologationDocument : null
    );

    const prepared = await prepareOrderFiscalSnapshotForEmission(persistedOrder, 1);

    expect(mocks.findAuthorizedFiscalDocument).toHaveBeenNthCalledWith(1, persistedOrder.id, {
      throwOnError: true,
      environment: 1,
    });
    expect(mocks.findAuthorizedFiscalDocument).toHaveBeenNthCalledWith(2, persistedOrder.id, {
      throwOnError: true,
    });
    expect(mocks.fetchFiscalDocumentDetails).not.toHaveBeenCalled();
    expect(mocks.ensureOrderItemsHaveFiscalSnapshots).toHaveBeenCalledWith(
      persistedOrder.items,
      undefined
    );
    expect(mocks.updateOrder).not.toHaveBeenCalled();
    expect(prepared.items).toEqual([snapshotItem]);
  });
});
