import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchGoodsReceiptsPage, subscribeToGoodsReceipts } from '../goodsReceiptQueryService';
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

// Mock Supabase Query Builder
let mockQueryResult: { data: any[] | null; count: number | null; error: any } = {
  data: [],
  count: 0,
  error: null,
};

const createQueryBuilder = () => {
  const builder: any = {
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    or: vi.fn(() => builder),
    order: vi.fn(() => builder),
    range: vi.fn(() => Promise.resolve(mockQueryResult)),
    limit: vi.fn(() => Promise.resolve(mockQueryResult)),
    then: (resolve: any) => Promise.resolve(mockQueryResult).then(resolve),
  };
  return builder;
};

let currentBuilder = createQueryBuilder();

const createChannel = () => {
  const ch: any = {
    on: vi.fn(() => ch),
    subscribe: vi.fn(() => ch),
  };
  return ch;
};

let currentChannel = createChannel();

vi.mock('@/pages/utils/supabaseConfig', () => ({
  supabase: {
    from: vi.fn(() => currentBuilder),
    channel: vi.fn(() => currentChannel),
    removeChannel: vi.fn(),
  },
}));

describe('goodsReceiptQueryService', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    mockQueryResult = { data: [], count: 0, error: null };
  });

  describe('fetchGoodsReceiptsPage', () => {
    it('deve buscar página com paginação padrão (page 1, pageSize 15)', async () => {
      mockQueryResult = {
        data: [
          {
            id: '11111111-2222-3333-4444-555555555555',
            receipt_index: 1,
            supplier_name: 'Fornecedor A',
            status: 'received',
            goods_receipt_items: [],
          },
        ],
        count: 1,
        error: null,
      };

      const result = await fetchGoodsReceiptsPage();

      expect(currentBuilder.range).toHaveBeenCalledWith(0, 14);
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(15);
      expect(result.totalCount).toBe(1);
      expect(result.totalPages).toBe(1);
      expect(result.items).toHaveLength(1);
      expect(result.items[0].supplierName).toBe('Fornecedor A');
    });

    it('deve calcular range e totalPages corretamente com página e tamanho personalizados', async () => {
      mockQueryResult = {
        data: [],
        count: 45,
        error: null,
      };

      const result = await fetchGoodsReceiptsPage({ page: 3, pageSize: 10 });

      expect(currentBuilder.range).toHaveBeenCalledWith(20, 29);
      expect(result.page).toBe(3);
      expect(result.pageSize).toBe(10);
      expect(result.totalCount).toBe(45);
      expect(result.totalPages).toBe(5); // ceil(45 / 10) = 5
    });

    it('deve aplicar filtros de status e busca textual', async () => {
      await fetchGoodsReceiptsPage({
        status: 'draft',
        searchTerm: 'Madeira',
      });

      expect(currentBuilder.eq).toHaveBeenCalledWith('status', 'draft');
      expect(currentBuilder.or).toHaveBeenCalledWith(
        'supplier_name.ilike.%Madeira%,invoice_number.ilike.%Madeira%'
      );
    });

    it('deve lidar com erro da consulta retornando lista vazia sem quebrar a UI', async () => {
      mockQueryResult = {
        data: null,
        count: null,
        error: new Error('Erro de conexão com o banco'),
      };

      const result = await fetchGoodsReceiptsPage();

      expect(result.items).toEqual([]);
      expect(result.totalCount).toBe(0);
      expect(result.totalPages).toBe(0);
    });
  });

  describe('subscribeToGoodsReceipts', () => {
    it('deve resolver conflitos entre cache local e banco priorizando STATUS_RANK (estornado > received > draft)', async () => {
      const receiptId = '11111111-2222-3333-4444-555555555555';

      // Localmente o item já foi estornado
      const localReceipt: GoodsReceipt = {
        id: receiptId,
        receiptIndex: 10,
        supplierName: 'Fornecedor X',
        receivedAt: '2026-10-01T10:00:00Z',
        items: [],
        totalValue: 100,
        status: 'estornado',
        isDraft: false,
      };
      storage.saveStoredReceipts([localReceipt]);

      // No banco ainda consta como 'received'
      mockQueryResult = {
        data: [
          {
            id: receiptId,
            receipt_index: 10,
            supplier_name: 'Fornecedor X',
            received_at: '2026-10-01T10:00:00Z',
            status: 'received',
            goods_receipt_items: [],
          },
        ],
        count: 1,
        error: null,
      };

      let emittedItems: GoodsReceipt[] = [];
      const unsubscribe = subscribeToGoodsReceipts((items) => {
        emittedItems = items;
      });

      // Aguarda tick microtarefa
      await new Promise((resolve) => setTimeout(resolve, 50));

      const merged = emittedItems.find((i) => i.id === receiptId);
      // Status estornado tem rank 2 vs received rank 1 -> vence estornado
      expect(merged?.status).toBe('estornado');

      unsubscribe();
    });

    it('deve configurar canal de Realtime e desinscrever limpando os canais', async () => {
      const callback = vi.fn();
      const unsubscribe = subscribeToGoodsReceipts(callback);

      const { supabase } = await import('@/pages/utils/supabaseConfig');

      expect(supabase.channel).toHaveBeenCalled();

      unsubscribe();
      expect(supabase.removeChannel).toHaveBeenCalled();
    });
  });
});
