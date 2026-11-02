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

import {
  createMobileGoodsReceipt,
  assertInvoiceAvailableForReceipt,
  reverseMobileGoodsReceipt,
  unreverseMobileGoodsReceipt,
} from './stockReceiptsService';
import { IN_USE_INVOICE_MESSAGE } from '../../../../shared-utils/receiptInvoiceAvailability';

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

  it('vincula a nota à entrada recebida também quando ela é parcial', async () => {
    mocks.rpc.mockResolvedValueOnce({ data: { receiptId: receipt.id }, error: null })
      .mockResolvedValueOnce({ data: true, error: null });
    await expect(
      createMobileGoodsReceipt({
        ...receipt,
        invoiceId: 'invoice',
        invoiceComplete: true,
        fiscalKey: 'key',
      }),
    ).resolves.toEqual({ invoiceUpdated: true });
    expect(mocks.rpc).toHaveBeenCalledWith('link_received_goods_receipt_to_invoice', {
      p_invoice_id: 'invoice', p_receipt_id: receipt.id,
    });
    mocks.rpc.mockResolvedValueOnce({ data: { receiptId: receipt.id }, error: null })
      .mockResolvedValueOnce({ data: true, error: null });
    await createMobileGoodsReceipt({
      ...receipt,
      invoiceId: 'invoice',
      invoiceComplete: false,
      fiscalKey: 'key',
    });
    expect(mocks.rpc).toHaveBeenCalledTimes(4);
  });

  it('informa falha na atualização da nota sem declarar que a entrada confirmada falhou', async () => {
    mocks.rpc.mockResolvedValueOnce({ data: { receiptId: receipt.id }, error: null })
      .mockResolvedValueOnce({ data: null, error: new Error('falhou') });
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

  it('impede confirmação offline', async () => {
    mocks.connected.connected = false;
    await expect(createMobileGoodsReceipt(receipt)).rejects.toThrow('internet');
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it('bloqueia a reutilização da NF e exclui o recebimento que está sendo editado', async () => {
    mocks.rpc.mockResolvedValueOnce({ data: [{ fiscal_key: 'KEY' }], error: null });
    await expect(assertInvoiceAvailableForReceipt('k-e.y', receipt.id)).rejects.toThrow(IN_USE_INVOICE_MESSAGE);
    expect(mocks.rpc).toHaveBeenCalledWith('in_use_goods_receipt_keys', {
      p_keys: ['KEY'], p_exclude_receipt_id: receipt.id,
    });
    mocks.rpc.mockResolvedValueOnce({ data: [], error: null });
    await expect(assertInvoiceAvailableForReceipt('key', receipt.id)).resolves.toBeUndefined();
  });

  it('impede o avanço quando não consegue conferir a nota', async () => {
    mocks.rpc.mockResolvedValueOnce({ data: null, error: { message: 'falhou' } });
    await expect(assertInvoiceAvailableForReceipt('key')).rejects.toThrow('Não foi possível conferir');
  });

  it('mostra o conflito quando outra confirmação vence a disputa no banco', async () => {
    mocks.rpc.mockResolvedValueOnce({ data: null, error: { code: '23505', message: 'goods_receipts_received_fiscal_key_unique' } });
    await expect(createMobileGoodsReceipt(receipt)).rejects.toThrow(IN_USE_INVOICE_MESSAGE);
  });
});

describe('status da movimentação mobile do recebimento', () => {
  it('estorna a entrada e depois restaura o recebimento como recebido', async () => {
    const receiptWithIndex = { ...receipt, receiptIndex: 5 };

    await reverseMobileGoodsReceipt(receiptWithIndex);
    await unreverseMobileGoodsReceipt(receipt.id);

    expect(mocks.rpc).toHaveBeenNthCalledWith(
      1,
      'set_goods_receipt_inventory_status_checked_transaction',
      {
        p_receipt_id: receipt.id,
        p_status: 'estornado',
        p_reason: 'Estorno do Recebimento #5',
      },
    );
    expect(mocks.rpc).toHaveBeenNthCalledWith(
      2,
      'set_goods_receipt_inventory_status_checked_transaction',
      {
        p_receipt_id: receipt.id,
        p_status: 'received',
        p_reason: null,
      },
    );
  });

  it('não solicita mudanças de status quando está offline', async () => {
    mocks.connected.connected = false;

    await expect(reverseMobileGoodsReceipt(receipt)).rejects.toThrow('internet');
    await expect(unreverseMobileGoodsReceipt(receipt.id)).rejects.toThrow('internet');
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
});
