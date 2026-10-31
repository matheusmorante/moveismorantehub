import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  rpc: vi.fn(),
  from: vi.fn(),
  connected: { connected: true },
}));
vi.mock('../supabaseClient', () => ({
  supabase: { rpc: mocks.rpc, from: mocks.from },
}));
vi.mock('../offline/connectivityService', () => ({
  connectivityService: mocks.connected,
}));
vi.mock('../offline/offlineStorageService', () => ({
  offlineStorageService: {},
  generateUUID: () => 'id',
}));

import { createMobileGoodsReceipt, fetchInvoiceReceiptItems } from './stockReceiptsService';

const receipt = {
  id: '11111111-1111-4111-8111-111111111111',
  supplierId: 'supplier',
  supplierName: 'Fornecedor',
  receivedAt: '2026-10-30T12:00:00Z',
  totalValue: 20,
  items: [
    {
      productId: 'product',
      variationId: 'variation',
      description: 'Mesa',
      quantity: 2,
      baseCost: 10,
      unitCost: 10,
      totalCost: 20,
    },
  ],
};

const builder = (response: unknown) => {
  const chain: any = {
    select: vi.fn(() => chain),
    update: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    is: vi.fn(() => chain),
    neq: vi.fn(() => chain),
    maybeSingle: vi.fn(async () => response),
    then: (resolve: any, reject: any) => Promise.resolve(response).then(resolve, reject),
  };
  return chain;
};

beforeEach(() => {
  mocks.connected.connected = true;
  mocks.rpc.mockResolvedValue({ data: { receiptId: receipt.id }, error: null });
});
afterEach(() => {
  vi.clearAllMocks();
  vi.useRealTimers();
});

describe('confirmação mobile de recebimento', () => {
  it('envia a origem de compra e os itens à transação do ERP', async () => {
    await expect(createMobileGoodsReceipt({ ...receipt, purchaseId: 'purchase' })).resolves.toEqual(
      { invoiceUpdated: true },
    );
    expect(mocks.rpc).toHaveBeenCalledWith(
      'confirm_goods_receipt_checked_transaction',
      expect.objectContaining({
        p_receipt: expect.objectContaining({
          id: receipt.id,
          purchase_id: 'purchase',
          supplier_id: 'supplier',
          status: 'received',
        }),
        p_items: [
          expect.objectContaining({
            productId: 'product',
            variationId: 'variation',
            quantity: 2,
          }),
        ],
      }),
    );
  });

  it('marca a nota após a entrada completa e não altera a nota em uma entrada parcial', async () => {
    const update = builder({ data: { id: 'invoice' }, error: null });
    mocks.from.mockReturnValue(update);
    await expect(
      createMobileGoodsReceipt({
        ...receipt,
        invoiceId: 'invoice',
        invoiceComplete: true,
        fiscalKey: 'key',
      }),
    ).resolves.toEqual({ invoiceUpdated: true });
    expect(update.update).toHaveBeenCalledWith(
      expect.objectContaining({
        status_recebimento: 'received',
        receipt_id: receipt.id,
      }),
    );
    expect(update.is).toHaveBeenCalledWith('receipt_id', null);
    mocks.from.mockClear();
    await createMobileGoodsReceipt({
      ...receipt,
      invoiceId: 'invoice',
      invoiceComplete: false,
      fiscalKey: 'key',
    });
    expect(mocks.from).not.toHaveBeenCalled();
  });

  it('informa falha na atualização da nota sem declarar que a entrada confirmada falhou', async () => {
    const update = builder({ data: null, error: new Error('falhou') });
    mocks.from.mockReturnValue(update);
    await expect(
      createMobileGoodsReceipt({
        ...receipt,
        invoiceId: 'invoice',
        invoiceComplete: true,
      }),
    ).resolves.toEqual({ invoiceUpdated: false });
  });

  it('consulta o mesmo recebimento depois de timeout antes de informar o resultado', async () => {
    vi.useFakeTimers();
    mocks.rpc.mockReturnValue(new Promise(() => {}));
    const check = builder({
      data: { id: receipt.id, status: 'received' },
      error: null,
    });
    mocks.from.mockReturnValue(check);
    const pending = createMobileGoodsReceipt(receipt);
    await vi.advanceTimersByTimeAsync(20_000);
    await expect(pending).resolves.toEqual({ invoiceUpdated: true });
    expect(check.eq).toHaveBeenCalledWith('id', receipt.id);
  });

  it('impede confirmação offline e consulta entradas anteriores sem incluir a tentativa atual', async () => {
    mocks.connected.connected = false;
    await expect(createMobileGoodsReceipt(receipt)).rejects.toThrow('internet');
    expect(mocks.rpc).not.toHaveBeenCalled();
    const previous = builder({
      data: [{ goods_receipt_items: [{ product_id: 'product', quantity: 1 }] }],
      error: null,
    });
    mocks.from.mockReturnValue(previous);
    await expect(fetchInvoiceReceiptItems('key', receipt.id)).resolves.toEqual([
      { product_id: 'product', quantity: 1 },
    ]);
    expect(previous.neq).toHaveBeenCalledWith('id', receipt.id);
  });
});
