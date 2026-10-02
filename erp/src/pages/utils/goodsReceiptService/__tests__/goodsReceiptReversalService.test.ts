import { describe, it, expect, vi, beforeEach } from 'vitest';
import { reverseGoodsReceipt, unreverseGoodsReceipt } from '../goodsReceiptReversalService';
import { GoodsReceipt } from '../goodsReceipt.types';
import * as storage from '../goodsReceiptStorage';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(globalThis, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

// Mock Supabase
const rpcMock = vi.fn();

vi.mock('@/pages/utils/supabaseConfig', () => ({
  supabase: {
    rpc: (...args: any[]) => rpcMock(...args),
  },
}));

describe('goodsReceiptReversalService', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    rpcMock.mockResolvedValue({ data: null, error: null });
  });

  describe('reverseGoodsReceipt', () => {
    it('deve estornar recebimento confirmado com sucesso chamando RPC transacional', async () => {
      const receipt: GoodsReceipt = {
        id: '11111111-2222-3333-4444-555555555555',
        receiptIndex: 42,
        supplierName: 'Fornecedor Sul',
        receivedAt: '2026-10-01T10:00:00Z',
        totalValue: 1500,
        status: 'received',
        isDraft: false,
        items: [
          {
            productId: 'prod-1',
            description: 'Item 1',
            quantity: 1,
            unitCost: 1500,
            totalCost: 1500,
          },
        ],
      };

      storage.saveStoredReceipts([receipt]);

      const reversed = await reverseGoodsReceipt(receipt.id);

      expect(reversed.status).toBe('estornado');
      expect(reversed.isDraft).toBe(false);
      expect(rpcMock).toHaveBeenCalledWith(
        'set_goods_receipt_inventory_status_checked_transaction',
        {
          p_receipt_id: receipt.id,
          p_status: 'estornado',
          p_reason: 'Estorno do Recebimento #42',
        }
      );

      const stored = storage.getStoredReceipts();
      expect(stored[0].status).toBe('estornado');
    });

    it('idempotência: não deve chamar RPC se o recebimento já estiver estornado', async () => {
      const receipt: GoodsReceipt = {
        id: '22222222-3333-4444-5555-666666666666',
        receiptIndex: 43,
        supplierName: 'Fornecedor Sul',
        receivedAt: '2026-10-01T10:00:00Z',
        totalValue: 500,
        status: 'estornado',
        isDraft: false,
        items: [],
      };

      storage.saveStoredReceipts([receipt]);

      const result = await reverseGoodsReceipt(receipt.id);

      expect(result.status).toBe('estornado');
      expect(rpcMock).not.toHaveBeenCalled();
    });

    it('deve lançar erro se o recebimento não for encontrado', async () => {
      await expect(reverseGoodsReceipt('inexistent-id')).rejects.toThrow(
        'Recebimento não encontrado.'
      );
      expect(rpcMock).not.toHaveBeenCalled();
    });

    it('deve propagar erro e manter estado local intacto caso a RPC falhe', async () => {
      rpcMock.mockResolvedValueOnce({
        data: null,
        error: new Error('Falha ao reverter movimentação de estoque'),
      });

      const receipt: GoodsReceipt = {
        id: '33333333-4444-5555-6666-777777777777',
        receiptIndex: 44,
        supplierName: 'Fornecedor Sul',
        receivedAt: '2026-10-01T10:00:00Z',
        totalValue: 800,
        status: 'received',
        isDraft: false,
        items: [],
      };

      storage.saveStoredReceipts([receipt]);

      await expect(reverseGoodsReceipt(receipt.id)).rejects.toThrow(
        'Falha ao reverter movimentação de estoque'
      );

      const stored = storage.getStoredReceipts();
      expect(stored[0].status).toBe('received'); // Permaneceu received
    });
  });

  describe('unreverseGoodsReceipt', () => {
    it('deve reativar recebimento estornado chamando RPC com status received', async () => {
      const receipt: GoodsReceipt = {
        id: '44444444-5555-6666-7777-888888888888',
        receiptIndex: 45,
        supplierName: 'Fornecedor Sul',
        receivedAt: '2026-10-01T10:00:00Z',
        totalValue: 900,
        status: 'estornado',
        isDraft: false,
        items: [],
      };

      storage.saveStoredReceipts([receipt]);

      const unreversed = await unreverseGoodsReceipt(receipt.id);

      expect(unreversed.status).toBe('received');
      expect(unreversed.isDraft).toBe(false);
      expect(rpcMock).toHaveBeenCalledWith(
        'set_goods_receipt_inventory_status_checked_transaction',
        {
          p_receipt_id: receipt.id,
          p_status: 'received',
          p_reason: null,
        }
      );

      const stored = storage.getStoredReceipts();
      expect(stored[0].status).toBe('received');
    });

    it('idempotência: não deve chamar RPC se o recebimento não estiver estornado', async () => {
      const receipt: GoodsReceipt = {
        id: '55555555-6666-7777-8888-999999999999',
        receiptIndex: 46,
        supplierName: 'Fornecedor Sul',
        receivedAt: '2026-10-01T10:00:00Z',
        totalValue: 900,
        status: 'received',
        isDraft: false,
        items: [],
      };

      storage.saveStoredReceipts([receipt]);

      const result = await unreverseGoodsReceipt(receipt.id);

      expect(result.status).toBe('received');
      expect(rpcMock).not.toHaveBeenCalled();
    });

    it('deve lançar erro ao tentar desfazer estorno de recebimento inexistente', async () => {
      await expect(unreverseGoodsReceipt('inexistent-id')).rejects.toThrow(
        'Recebimento não encontrado.'
      );
      expect(rpcMock).not.toHaveBeenCalled();
    });

    it('deve propagar erro e manter estado local como estornado se a RPC falhar', async () => {
      rpcMock.mockResolvedValueOnce({
        data: null,
        error: new Error('Concorrência no banco de dados'),
      });

      const receipt: GoodsReceipt = {
        id: '66666666-7777-8888-9999-000000000000',
        receiptIndex: 47,
        supplierName: 'Fornecedor Sul',
        receivedAt: '2026-10-01T10:00:00Z',
        totalValue: 900,
        status: 'estornado',
        isDraft: false,
        items: [],
      };

      storage.saveStoredReceipts([receipt]);

      await expect(unreverseGoodsReceipt(receipt.id)).rejects.toThrow(
        'Concorrência no banco de dados'
      );

      const stored = storage.getStoredReceipts();
      expect(stored[0].status).toBe('estornado');
    });
  });
});
