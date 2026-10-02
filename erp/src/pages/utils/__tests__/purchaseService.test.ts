import { describe, it, expect, vi, beforeEach } from 'vitest';
import Purchase from '../../types/purchase.type';

const {
  mockSelect,
  mockInsert,
  mockUpdate,
  mockDelete,
  mockEq,
  mockOrder,
  mockLimit,
  mockSingle,
  mockFrom,
  mockChannel,
  mockRemoveChannel,
  mockCancelInventoryMoves,
} = vi.hoisted(() => {
  const mockSelect = vi.fn();
  const mockInsert = vi.fn();
  const mockUpdate = vi.fn();
  const mockDelete = vi.fn();
  const mockEq = vi.fn();
  const mockOrder = vi.fn();
  const mockLimit = vi.fn();
  const mockSingle = vi.fn();
  const mockFrom = vi.fn(() => ({
    select: mockSelect,
    insert: mockInsert,
    update: mockUpdate,
    delete: mockDelete,
  }));
  const mockChannel = vi.fn(() => ({
    on: vi.fn().mockReturnThis(),
    subscribe: vi.fn().mockReturnValue({}),
  }));
  const mockRemoveChannel = vi.fn();
  const mockCancelInventoryMoves = vi.fn();

  return {
    mockSelect,
    mockInsert,
    mockUpdate,
    mockDelete,
    mockEq,
    mockOrder,
    mockLimit,
    mockSingle,
    mockFrom,
    mockChannel,
    mockRemoveChannel,
    mockCancelInventoryMoves,
  };
});

vi.mock('@/pages/utils/supabaseConfig', () => ({
  supabase: {
    from: mockFrom,
    channel: mockChannel,
    removeChannel: mockRemoveChannel,
  },
}));

vi.mock('@/pages/utils/inventoryService', () => ({
  cancelInventoryMovesByRelatedEntity: (...args: any[]) => mockCancelInventoryMoves(...args),
}));

vi.mock('@/pages/utils/settingsService', () => ({
  getSettings: vi.fn().mockResolvedValue({}),
}));

import {
  savePurchase,
  updatePurchase,
  cancelPurchase,
  reverseInventoryMoves,
} from '../purchaseService';

describe('Suíte Unitária e de Integração: purchaseService (Pedidos de Compra)', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    const queryBuilder: any = {};
    queryBuilder.select = mockSelect.mockImplementation(() => queryBuilder);
    queryBuilder.insert = mockInsert.mockImplementation(() => ({
      select: vi.fn().mockResolvedValue({
        data: [
          {
            id: 'd9b2d6a1-0001-4000-8000-000000000001',
            purchase_number: 1,
            supplier_id: 'sup-123',
            supplier_name: 'Fornecedor Alpha',
            date: '2026-10-01T12:00:00.000Z',
            total_value: 1500,
            status: 'ordered',
            stockProcessed: false,
          },
        ],
        error: null,
      }),
    }));
    queryBuilder.update = mockUpdate.mockImplementation(() => ({
      eq: mockEq.mockResolvedValue({ data: null, error: null }),
    }));
    queryBuilder.delete = mockDelete.mockImplementation(() => ({
      eq: mockEq.mockResolvedValue({ data: null, error: null }),
    }));
    queryBuilder.eq = mockEq.mockImplementation(() => queryBuilder);
    queryBuilder.order = mockOrder.mockImplementation(() => queryBuilder);
    queryBuilder.limit = mockLimit.mockResolvedValue({ data: [], error: null });
    queryBuilder.single = mockSingle;

    mockFrom.mockReturnValue(queryBuilder);
  });

  describe('1. Salvamento de Pedido de Compra (savePurchase)', () => {
    it('salva compra com sucesso e sincroniza itens normalizados em purchase_items', async () => {
      const validPurchase: Purchase = {
        supplierId: 'sup-123',
        supplierName: 'Fornecedor Alpha',
        date: '2026-10-01T12:00:00.000Z',
        totalValue: 1500,
        observation: 'Pedido de teste de estoque',
        status: 'ordered',
        ipiPercent: 5,
        freightPercent: 10,
        items: [
          {
            productId: 'prod-001',
            description: 'Mesa de Centro',
            quantity: 2,
            baseCost: 500,
            unitCost: 575,
            totalCost: 1150,
          },
        ],
      };

      const resultId = await savePurchase(validPurchase);

      expect(resultId).toBe('d9b2d6a1-0001-4000-8000-000000000001');
      expect(mockFrom).toHaveBeenCalledWith('purchases');
      // Deve ter sincronizado com purchase_items
      expect(mockFrom).toHaveBeenCalledWith('purchase_items');
    });

    it('rejeita salvamento se o Supabase retornar erro', async () => {
      mockInsert.mockReturnValue({
        select: vi.fn().mockResolvedValue({
          data: null,
          error: new Error('Erro de chave estrangeira no fornecedor'),
        }),
      });

      const invalidPurchase: Purchase = {
        supplierId: 'invalid-id',
        supplierName: 'Fornecedor Invalido',
        date: '2026-10-01',
        totalValue: 100,
        status: 'ordered',
        items: [],
      };

      await expect(savePurchase(invalidPurchase)).rejects.toThrow(
        'Erro de chave estrangeira no fornecedor'
      );
    });
  });

  describe('2. Atualização de Pedido de Compra (updatePurchase)', () => {
    it('persiste novos campos cadastrais, IPI e Frete corretamente', async () => {
      const purchaseId = 'd9b2d6a1-0001-4000-8000-000000000001';

      mockSingle.mockResolvedValue({
        data: {
          id: purchaseId,
          purchase_number: 1,
          supplier_id: 'sup-123',
          supplier_name: 'Fornecedor Alpha',
          date: '2026-10-01T12:00:00.000Z',
          total_value: 1500,
          status: 'ordered',
          stockProcessed: false,
          purchase_items: [],
        },
        error: null,
      });

      mockUpdate.mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: null, error: null }),
      });

      await updatePurchase(purchaseId, {
        supplierName: 'Fornecedor Alpha LTDA',
        ipiPercent: 8,
        freightPercent: 12,
        totalValue: 1650,
        observation: 'Revisado valor de frete',
      });

      expect(mockFrom).toHaveBeenCalledWith('purchases');
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          supplier_name: 'Fornecedor Alpha LTDA',
          ipi_value: 8,
          freight_percent: 12,
          total_value: 1650,
          observation: 'Revisado valor de frete',
        })
      );
    });

    it('estorna movimentações de estoque se o status for alterado para cancelled em compra já processada', async () => {
      const purchaseId = 'd9b2d6a1-0001-4000-8000-000000000002';

      mockSingle.mockResolvedValue({
        data: {
          id: purchaseId,
          purchase_number: 2,
          supplier_id: 'sup-123',
          supplier_name: 'Fornecedor Alpha',
          date: '2026-10-01T12:00:00.000Z',
          total_value: 2000,
          status: 'ordered',
          stockProcessed: true,
          purchase_items: [],
        },
        error: null,
      });

      mockCancelInventoryMoves.mockResolvedValue(undefined);

      await updatePurchase(purchaseId, {
        status: 'cancelled',
      });

      expect(mockCancelInventoryMoves).toHaveBeenCalledWith(
        purchaseId,
        'purchase_order',
        expect.stringContaining('Cancelamento do pedido de compra')
      );
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'cancelled',
          stockProcessed: false,
        })
      );
    });

    it('lança erro se o pedido de compra a ser atualizado não existir', async () => {
      mockSingle.mockResolvedValue({
        data: null,
        error: null,
      });

      await expect(
        updatePurchase('inexistente', { observation: 'Teste' })
      ).rejects.toThrow('Pedido não encontrado');
    });
  });

  describe('3. Cancelamento Seguro de Pedido de Compra (cancelPurchase)', () => {
    it('cancela pedido em ordem com sucesso sem movimentação de estoque', async () => {
      const purchase: Purchase = {
        id: 'd9b2d6a1-0001-4000-8000-000000000003',
        purchaseNumber: 3,
        supplierId: 'sup-beta',
        supplierName: 'Fornecedor Beta',
        date: '2026-10-01',
        totalValue: 500,
        status: 'ordered',
        stockProcessed: false,
        items: [],
      };

      await cancelPurchase(purchase);

      expect(mockCancelInventoryMoves).not.toHaveBeenCalled();
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'cancelled',
          stockProcessed: false,
        })
      );
    });

    it('reverte estoque automaticamente se stockProcessed for verdadeiro ao cancelar', async () => {
      const purchase: Purchase = {
        id: 'd9b2d6a1-0001-4000-8000-000000000004',
        purchaseNumber: 4,
        supplierId: 'sup-gama',
        supplierName: 'Fornecedor Gama',
        date: '2026-10-01',
        totalValue: 1200,
        status: 'ordered',
        stockProcessed: true,
        items: [],
      };

      await cancelPurchase(purchase);

      expect(mockCancelInventoryMoves).toHaveBeenCalledWith(
        purchase.id,
        'purchase_order',
        expect.stringContaining('Cancelamento do pedido de compra #4 - Fornecedor Gama')
      );
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'cancelled',
          stockProcessed: false,
        })
      );
    });

    it('rejeita cancelamento com erro se o pedido já estiver cancelado (idempotência)', async () => {
      const purchase: Purchase = {
        id: 'd9b2d6a1-0001-4000-8000-000000000005',
        purchaseNumber: 5,
        supplierId: 'sup-delta',
        supplierName: 'Fornecedor Delta',
        date: '2026-10-01',
        totalValue: 800,
        status: 'cancelled',
        stockProcessed: false,
        items: [],
      };

      await expect(cancelPurchase(purchase)).rejects.toThrow(
        'Este pedido de compra já está cancelado.'
      );
      expect(mockUpdate).not.toHaveBeenCalled();
    });
  });

  describe('4. Reversão Direta de Estoque (reverseInventoryMoves)', () => {
    it('chama cancelamento de movimentações por entidade relacionada e limpa stockProcessed', async () => {
      const purchaseId = 'd9b2d6a1-0001-4000-8000-000000000006';

      await reverseInventoryMoves(purchaseId, 'Motivo de estorno operacional');

      expect(mockCancelInventoryMoves).toHaveBeenCalledWith(
        purchaseId,
        'purchase_order',
        'Motivo de estorno operacional'
      );
      expect(mockUpdate).toHaveBeenCalledWith({ stockProcessed: false });
    });
  });
});
