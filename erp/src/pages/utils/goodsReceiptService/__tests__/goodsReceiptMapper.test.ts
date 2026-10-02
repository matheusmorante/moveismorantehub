import { describe, it, expect, vi } from 'vitest';
import { isValidUuid, mapGoodsReceiptRow, buildGoodsReceiptDbPayload } from '../goodsReceiptMapper';
import { syncGoodsReceiptItems } from '../goodsReceiptItemsSync';
import { GoodsReceipt } from '../goodsReceipt.types';

vi.mock('@/pages/utils/supabaseConfig', () => ({
  supabase: {
    from: vi.fn(() => ({
      delete: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ error: null })),
      })),
      insert: vi.fn(() => Promise.resolve({ error: null })),
    })),
  },
}));

describe('goodsReceiptMapper e goodsReceiptItemsSync', () => {
  describe('isValidUuid', () => {
    it('deve validar UUIDs válidos nos formatos minúsculo e maiúsculo', () => {
      expect(isValidUuid('11111111-2222-4333-8444-555555555555')).toBe(true);
      expect(isValidUuid('A1B2C3D4-E5F6-4A1B-8C2D-3E4F5A6B7C8D')).toBe(true);
    });

    it('deve rejeitar valores nulos, vazios ou em formato inválido', () => {
      expect(isValidUuid(undefined)).toBe(false);
      expect(isValidUuid('')).toBe(false);
      expect(isValidUuid('not-a-uuid')).toBe(false);
      expect(isValidUuid('11111111-2222-4333-8444-55555555555')).toBe(false); // 1 char curto
      expect(isValidUuid('11111111-2222-4333-8444-5555555555555')).toBe(false); // 1 char longo
    });
  });

  describe('mapGoodsReceiptRow', () => {
    it('deve mapear linha do banco com goods_receipt_items ordenados por item_index', () => {
      const dbRow = {
        id: '11111111-2222-4333-8444-555555555555',
        receipt_index: 42,
        supplier_id: 'supplier-uuid-1',
        supplier_name: 'Fornecedor Exemplo Ltda',
        received_at: '2026-10-01T12:00:00Z',
        invoice_number: '123456',
        invoice_date: '2026-10-01',
        total_value: 2500.5,
        observation: 'Entregue na doca 2',
        fiscal_key: '41261011111111111111550010001234561000000015',
        attachments: ['https://storage/anexo1.pdf'],
        status: 'received',
        is_draft: false,
        ipi_percent: 5,
        freight_percent: 10,
        non_fiscal_discount_mode: 'fixed',
        non_fiscal_discount_value: 50,
        fiscal_ipi: 100,
        fiscal_freight: 200,
        fiscal_discount: 30,
        fiscal_other_expenses: 15,
        created_at: '2026-10-01T10:00:00Z',
        updated_at: '2026-10-01T12:00:00Z',
        goods_receipt_items: [
          {
            item_index: 2,
            product_id: 'prod-2',
            variation_id: 'var-2',
            description: 'Item 2',
            quantity: 3,
            base_cost: 150,
            unit_cost: 165,
            freight_fiscal_unit: 10,
            discount_unit: 5,
          },
          {
            item_index: 1,
            product_id: 'prod-1',
            variation_id: 'var-1',
            description: 'Item 1',
            quantity: 5,
            base_cost: 100,
            unit_cost: 110,
            freight_fiscal_unit: 8,
            discount_unit: 3,
          },
        ],
      };

      const result = mapGoodsReceiptRow(dbRow);

      expect(result.id).toBe(dbRow.id);
      expect(result.receiptIndex).toBe(42);
      expect(result.supplierName).toBe('Fornecedor Exemplo Ltda');
      expect(result.status).toBe('received');
      expect(result.isDraft).toBe(false);
      expect(result.totalValue).toBe(2500.5);
      expect(result.fiscalKey).toBe(dbRow.fiscal_key);
      expect(result.attachments).toEqual(['https://storage/anexo1.pdf']);

      // Verifica ordenação por item_index (Item 1 antes de Item 2)
      expect(result.items).toHaveLength(2);
      expect(result.items[0].description).toBe('Item 1');
      expect(result.items[0].quantity).toBe(5);
      expect(result.items[0].unitCost).toBe(110);
      expect(result.items[1].description).toBe('Item 2');
      expect(result.items[1].quantity).toBe(3);
      expect(result.items[1].unitCost).toBe(165);
    });

    it('deve usar fallback de items legado quando goods_receipt_items estiver vazio ou ausente', () => {
      const dbRow = {
        id: 'legacy-id',
        status: 'draft',
        items: [
          {
            productId: 'legacy-prod',
            description: 'Item Legado',
            quantity: 2,
            unitCost: 80,
          },
        ],
      };

      const result = mapGoodsReceiptRow(dbRow);
      expect(result.items).toHaveLength(1);
      expect(result.items[0].description).toBe('Item Legado');
      expect(result.status).toBe('draft');
      expect(result.isDraft).toBe(true);
    });

    it('deve mapear corretamente o status estornado', () => {
      const dbRow = {
        id: '11111111-2222-4333-8444-555555555555',
        status: 'estornado',
      };
      const result = mapGoodsReceiptRow(dbRow);
      expect(result.status).toBe('estornado');
      expect(result.isDraft).toBe(false);
    });
  });

  describe('buildGoodsReceiptDbPayload', () => {
    it('deve construir payload do banco sanitizando UUIDs e definindo padrões', () => {
      const receipt: GoodsReceipt = {
        id: '11111111-2222-4333-8444-555555555555',
        receiptIndex: 10,
        purchaseId: 'invalid-purchase-uuid',
        supplierId: '22222222-3333-4444-8555-666666666666',
        supplierName: 'Madeiras Silva',
        receivedAt: '2026-10-01T12:00:00Z',
        items: [],
        totalValue: 1200,
        status: 'received',
        isDraft: false,
        nonFiscalDiscountMode: 'percent',
        nonFiscalDiscountValue: 10,
      };

      const now = '2026-10-01T15:00:00Z';
      const payload = buildGoodsReceiptDbPayload(receipt, now);

      expect(payload.id).toBe(receipt.id);
      expect(payload.receipt_index).toBe(10);
      expect(payload.purchase_id).toBeNull(); // UUID inválido foi sanitizado para null
      expect(payload.supplier_id).toBe('22222222-3333-4444-8555-666666666666'); // UUID válido preservado
      expect(payload.supplier_name).toBe('Madeiras Silva');
      expect(payload.total_value).toBe(1200);
      expect(payload.status).toBe('received');
      expect(payload.is_draft).toBe(false);
      expect(payload.non_fiscal_discount_mode).toBe('percent');
      expect(payload.non_fiscal_discount_value).toBe(10);
      expect(payload.fiscal_freight).toBe(0); // Padrão 0 quando não informado
      expect(payload.updated_at).toBe(now);
    });
  });

  describe('syncGoodsReceiptItems', () => {
    it('não deve fazer nada se receiptId não for um UUID válido', async () => {
      const { supabase } = await import('@/pages/utils/supabaseConfig');
      vi.clearAllMocks();

      await syncGoodsReceiptItems('invalid-id', [
        { productId: 'p-1', description: 'teste', quantity: 1, unitCost: 10, totalCost: 10 },
      ]);
      expect(supabase.from).not.toHaveBeenCalled();
    });

    it('deve deletar itens existentes e inserir os novos itens normalizados', async () => {
      const { supabase } = await import('@/pages/utils/supabaseConfig');
      vi.clearAllMocks();

      const receiptId = '11111111-2222-4333-8444-555555555555';
      const items = [
        {
          productId: '22222222-3333-4444-8555-666666666666',
          description: 'Parafuso Philips',
          quantity: 100,
          baseCost: 0.15,
          unitCost: 0.18,
          freightFiscalUnit: 0.02,
        },
      ];

      await syncGoodsReceiptItems(receiptId, items as any);

      expect(supabase.from).toHaveBeenCalledWith('goods_receipt_items');
    });
  });
});
