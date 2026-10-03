import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
}));

vi.mock('../../../services/supabaseClient', () => ({
  supabase: {
    from: mocks.from,
  },
}));

import { mapPurchaseFromDb, purchaseStatusLabel } from './mobilePurchaseService';

describe('Suíte Unitária: mobilePurchaseService (Pedidos de Compra Mobile)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
  });

  describe('2. Labels de status amigáveis (purchaseStatusLabel)', () => {
    it('traduz status de negócio corretamente para a interface', () => {
      expect(purchaseStatusLabel('ordered')).toBe('Em Ordem');
      expect(purchaseStatusLabel('fulfilled')).toBe('Atendido');
      expect(purchaseStatusLabel('cancelled')).toBe('Cancelado');
    });
  });
});
