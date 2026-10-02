import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  saveGoodsReceiptDraft,
  finalizeGoodsReceipt,
  saveGoodsReceipt,
  deleteGoodsReceipt,
} from '../goodsReceiptMutationService';
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
const fromMock = vi.fn();

vi.mock('@/pages/utils/supabaseConfig', () => ({
  supabase: {
    rpc: (...args: any[]) => rpcMock(...args),
    from: (...args: any[]) => fromMock(...args),
  },
}));

vi.mock('../../goodsReceiptCode', () => ({
  getNextGoodsReceiptIndex: vi.fn(() => Promise.resolve(101)),
}));

describe('goodsReceiptMutationService', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();

    fromMock.mockReturnValue({
      upsert: vi.fn().mockResolvedValue({ error: null }),
      delete: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      }),
      insert: vi.fn().mockResolvedValue({ error: null }),
    });

    rpcMock.mockImplementation((fnName: string) => {
      if (fnName === 'confirm_goods_receipt_checked_transaction') {
        return Promise.resolve({
          data: {
            moves: [
              { itemIndex: 1, inventoryMoveId: 'move-uuid-1' },
              { itemIndex: 2, inventoryMoveId: 'move-uuid-2' },
            ],
          },
          error: null,
        });
      }
      if (fnName === 'delete_goods_receipt_draft_transaction') {
        return Promise.resolve({ error: null });
      }
      return Promise.resolve({ data: null, error: null });
    });
  });

  describe('saveGoodsReceiptDraft', () => {
    it('deve criar novo rascunho com status draft, isDraft true e novo receiptIndex', async () => {
      const draft = await saveGoodsReceiptDraft({
        supplierName: 'Fornecedor A',
        invoiceNumber: '00123',
        totalValue: 500,
        items: [
          {
            productId: 'prod-comp-1',
            description: 'Compensado',
            quantity: 5,
            unitCost: 100,
            totalCost: 500,
          },
        ],
      });

      expect(draft.id).toBeDefined();
      expect(draft.receiptIndex).toBe(101);
      expect(draft.status).toBe('draft');
      expect(draft.isDraft).toBe(true);
      expect(draft.supplierName).toBe('Fornecedor A');
      expect(draft.totalValue).toBe(500);

      const stored = storage.getStoredReceipts();
      expect(stored).toHaveLength(1);
      expect(stored[0].id).toBe(draft.id);
      expect(stored[0].status).toBe('draft');
    });

    it('deve atualizar rascunho existente preservando receiptIndex e atualizando campos', async () => {
      const initialDraft: GoodsReceipt = {
        id: '11111111-2222-3333-4444-555555555555',
        receiptIndex: 88,
        supplierName: 'Fornecedor Inicial',
        receivedAt: '2026-10-01T10:00:00Z',
        items: [],
        totalValue: 100,
        status: 'draft',
        isDraft: true,
      };

      storage.saveStoredReceipts([initialDraft]);

      const updated = await saveGoodsReceiptDraft({
        id: initialDraft.id,
        supplierName: 'Fornecedor Atualizado',
        totalValue: 350,
      });

      expect(updated.id).toBe(initialDraft.id);
      expect(updated.receiptIndex).toBe(88); // Preservou o índice original
      expect(updated.supplierName).toBe('Fornecedor Atualizado');
      expect(updated.totalValue).toBe(350);
      expect(updated.status).toBe('draft');

      const stored = storage.getStoredReceipts();
      expect(stored[0].supplierName).toBe('Fornecedor Atualizado');
    });
  });

  describe('finalizeGoodsReceipt', () => {
    it('deve finalizar o recebimento via RPC atômica e vincular inventoryMoveId aos itens', async () => {
      const receipt: GoodsReceipt = {
        id: '11111111-2222-3333-4444-555555555555',
        receiptIndex: 50,
        supplierName: 'Madeiras Paraná',
        receivedAt: '2026-10-01T12:00:00Z',
        totalValue: 1000,
        status: 'draft',
        isDraft: true,
        items: [
          {
            productId: 'prod-1',
            description: 'Item 1',
            quantity: 2,
            unitCost: 250,
            totalCost: 500,
          },
          {
            productId: 'prod-2',
            description: 'Item 2',
            quantity: 1,
            unitCost: 500,
            totalCost: 500,
          },
        ],
      };

      storage.saveStoredReceipts([receipt]);

      const finalized = await finalizeGoodsReceipt(receipt);

      expect(finalized.status).toBe('received');
      expect(finalized.isDraft).toBe(false);
      expect(finalized.items[0].inventoryMoveId).toBe('move-uuid-1');
      expect(finalized.items[1].inventoryMoveId).toBe('move-uuid-2');

      expect(rpcMock).toHaveBeenCalledWith('confirm_goods_receipt_checked_transaction', {
        p_receipt: expect.objectContaining({
          id: receipt.id,
          status: 'received',
          is_draft: false,
        }),
        p_items: receipt.items,
      });

      const stored = storage.getStoredReceipts();
      expect(stored[0].status).toBe('received');
      expect(stored[0].isDraft).toBe(false);
      expect(stored[0].items[0].inventoryMoveId).toBe('move-uuid-1');
      expect(stored[0].items[1].inventoryMoveId).toBe('move-uuid-2');
    });

    it('deve lançar erro e não atualizar armazenamento local caso a RPC falhe', async () => {
      rpcMock.mockResolvedValueOnce({
        data: null,
        error: new Error('Erro de integridade no banco'),
      });

      const receipt: GoodsReceipt = {
        id: '11111111-2222-3333-4444-555555555555',
        receiptIndex: 50,
        supplierName: 'Madeiras Paraná',
        receivedAt: '2026-10-01T12:00:00Z',
        totalValue: 1000,
        status: 'draft',
        isDraft: true,
        items: [],
      };

      storage.saveStoredReceipts([receipt]);

      await expect(finalizeGoodsReceipt(receipt)).rejects.toThrow('Erro de integridade no banco');

      // Estado local permaneceu como draft sem alterações espúrias
      const stored = storage.getStoredReceipts();
      expect(stored[0].status).toBe('draft');
      expect(stored[0].isDraft).toBe(true);
    });
  });

  describe('saveGoodsReceipt', () => {
    it('deve salvar diretamente um recebimento finalizado', async () => {
      const saved = await saveGoodsReceipt({
        supplierName: 'Fornecedor Direto',
        totalValue: 1200,
        items: [
          { productId: 'p1', description: 'Item 1', quantity: 2, unitCost: 600, totalCost: 1200 },
        ],
      });

      expect(saved.id).toBeDefined();
      expect(saved.status).toBe('received');
      expect(saved.isDraft).toBe(false);
      expect(saved.items[0].inventoryMoveId).toBe('move-uuid-1');
      expect(rpcMock).toHaveBeenCalledWith(
        'confirm_goods_receipt_checked_transaction',
        expect.anything()
      );
    });
  });

  describe('deleteGoodsReceipt', () => {
    it('deve excluir rascunho com sucesso e chamar RPC quando id for UUID', async () => {
      const draftId = '11111111-2222-3333-4444-555555555555';
      const draft: GoodsReceipt = {
        id: draftId,
        supplierName: 'Rascunho a deletar',
        receivedAt: '2026-10-01T10:00:00Z',
        totalValue: 100,
        status: 'draft',
        isDraft: true,
        items: [],
      };

      storage.saveStoredReceipts([draft]);

      await deleteGoodsReceipt(draftId);

      expect(rpcMock).toHaveBeenCalledWith('delete_goods_receipt_draft_transaction', {
        p_receipt_id: draftId,
      });

      const stored = storage.getStoredReceipts();
      expect(stored).toHaveLength(0);
    });

    it('deve impedir exclusão de recebimento confirmado (received) e lançar erro claro', async () => {
      const confirmedId = '22222222-3333-4444-5555-666666666666';
      const confirmedReceipt: GoodsReceipt = {
        id: confirmedId,
        supplierName: 'Recebimento Concluído',
        receivedAt: '2026-10-01T10:00:00Z',
        totalValue: 500,
        status: 'received',
        isDraft: false,
        items: [],
      };

      storage.saveStoredReceipts([confirmedReceipt]);

      await expect(deleteGoodsReceipt(confirmedId)).rejects.toThrow(
        'Recebimento confirmado não pode ser excluído; use o estorno.'
      );

      const stored = storage.getStoredReceipts();
      expect(stored).toHaveLength(1);
    });

    it('deve impedir exclusão de recebimento estornado', async () => {
      const reversedId = '33333333-4444-5555-6666-777777777777';
      const reversedReceipt: GoodsReceipt = {
        id: reversedId,
        supplierName: 'Recebimento Estornado',
        receivedAt: '2026-10-01T10:00:00Z',
        totalValue: 500,
        status: 'estornado',
        isDraft: false,
        items: [],
      };

      storage.saveStoredReceipts([reversedReceipt]);

      await expect(deleteGoodsReceipt(reversedId)).rejects.toThrow(
        'Recebimento confirmado não pode ser excluído; use o estorno.'
      );
    });
  });
});
