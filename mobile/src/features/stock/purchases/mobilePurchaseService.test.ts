import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
}));

vi.mock('../../../services/supabaseClient', () => ({
  supabase: {
    from: mocks.from,
  },
}));

import { cancelMobilePurchase, fetchMobilePurchases, mapPurchaseFromDb, purchaseStatusLabel } from './mobilePurchaseService';

describe('Suíte Unitária: mobilePurchaseService (Pedidos de Compra Mobile)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('não cria número de compra pela posição da página mobile', async () => {
    const query: any = {
      select: vi.fn().mockReturnThis(), order: vi.fn().mockReturnThis(),
      range: vi.fn().mockResolvedValue({
        data: [{ id: 'purchase-stable-id', supplier_name: 'Fornecedor', status: 'ordered' }],
        count: 1, error: null,
      }),
    };
    mocks.from.mockReturnValue(query);
    const result = await fetchMobilePurchases(2);
    expect(result.data[0].purchaseNumber).toBeUndefined();
    expect(result.data[0].id).toBe('purchase-stable-id');
  });

  it('usa o código curto no motivo de estorno quando não há número salvo', async () => {
    const stop = new Error('interromper antes da gravação simulada');
    const update = vi.fn(() => { throw stop; });
    const query: any = {
      select: vi.fn().mockReturnThis(),
      or: vi.fn().mockResolvedValue({ data: [{ id: 'move' }], error: null }),
      update,
    };
    mocks.from.mockReturnValue(query);
    const purchase = mapPurchaseFromDb({
      id: 'abcdef12-0001-4000-8000-00000000ab45', status: 'ordered', stockProcessed: true,
    });
    await expect(cancelMobilePurchase(purchase)).rejects.toBe(stop);
    expect(update).toHaveBeenCalledWith(expect.objectContaining({
      reason: 'Cancelamento do pedido de compra #ABCDEF12',
    }));
  });

  describe('1. Mapeamento de registros do banco (mapPurchaseFromDb)', () => {
    it('normaliza itens estruturados da tabela purchase_items', () => {
      const rawRow = {
        id: 'purch-mobile-001',
        purchase_number: 10,
        supplier_id: 'sup-99',
        supplier_name: 'Fornecedor Mobile Estofados',
        date: '2026-10-01T15:00:00.000Z',
        total_value: 3500.5,
        status: 'ordered',
        stockProcessed: false,
        ipi_value: 5,
        freight_percent: 8,
        purchase_items: [
          {
            item_index: 1,
            product_id: 'prod-sofa',
            description: 'Sofá Retrátil 3 Lugares',
            quantity: 2,
            base_cost: 1500,
            unit_cost: 1695,
            total_cost: 3390,
          },
        ],
      };

      const mapped = mapPurchaseFromDb(rawRow);

      expect(mapped.id).toBe('purch-mobile-001');
      expect(mapped.purchaseNumber).toBe(10);
      expect(mapped.supplierName).toBe('Fornecedor Mobile Estofados');
      expect(mapped.status).toBe('ordered');
      expect(mapped.ipiPercent).toBe(5);
      expect(mapped.freightPercent).toBe(8);
      expect(mapped.items).toHaveLength(1);
      expect(mapped.items[0]).toEqual(
        expect.objectContaining({
          productId: 'prod-sofa',
          description: 'Sofá Retrátil 3 Lugares',
          quantity: 2,
          unitCost: 1695,
          totalCost: 3390,
        })
      );
    });

    it('faz fallback para array jsonb legada caso purchase_items não exista', () => {
      const legacyRow = {
        id: 'purch-legacy-002',
        supplier_name: 'Fornecedor Antigo',
        date: '2026-09-01',
        total_value: 800,
        status: 'fulfilled',
        stockProcessed: true,
        items: [
          {
            productId: 'prod-poltrona',
            description: 'Poltrona Giratória',
            quantity: 1,
            baseCost: 800,
            unitCost: 800,
            totalCost: 800,
          },
        ],
      };

      const mapped = mapPurchaseFromDb(legacyRow, 2);

      expect(mapped.purchaseNumber).toBe(2);
      expect(mapped.status).toBe('fulfilled');
      expect(mapped.items[0].description).toBe('Poltrona Giratória');
      expect(mapped.stockProcessed).toBe(true);
    });

    it('normaliza status desconhecido para ordered com segurança', () => {
      const rowWithInvalidStatus = {
        id: 'purch-003',
        supplier_name: 'Fornecedor Desconhecido',
        status: 'status_desconhecido',
      };

      const mapped = mapPurchaseFromDb(rowWithInvalidStatus);
      expect(mapped.status).toBe('ordered');
    });

    it('ignora itens sem identificador de produto ao mapear ou confirmar compra', () => {
      const rowWithBlankItem = {
        id: 'purch-004',
        supplier_name: 'Fornecedor Teste',
        status: 'ordered',
        purchase_items: [
          {
            item_index: 1,
            product_id: 'prod-valido',
            description: 'Item Válido',
            quantity: 2,
            base_cost: 100,
            unit_cost: 100,
            total_cost: 200,
          },
          {
            item_index: 2,
            product_id: '',
            description: '',
            quantity: 1,
            base_cost: 0,
            unit_cost: 0,
            total_cost: 0,
          },
        ],
      };

      const mapped = mapPurchaseFromDb(rowWithBlankItem);
      expect(mapped.items[0].productId).toBe('prod-valido');
      expect(mapped.items[0].quantity).toBe(2);
    });
  });

  describe('2. Labels de status amigáveis (purchaseStatusLabel)', () => {
    it('traduz status de negócio corretamente para a interface', () => {
      expect(purchaseStatusLabel('ordered')).toBe('Em Ordem');
      expect(purchaseStatusLabel('fulfilled')).toBe('Atendido');
      expect(purchaseStatusLabel('cancelled')).toBe('Cancelado');
    });
  });
});
