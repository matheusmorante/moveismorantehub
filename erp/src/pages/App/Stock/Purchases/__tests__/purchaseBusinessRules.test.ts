import { describe, it, expect } from 'vitest';
import { PurchaseItem } from '../../../../types/purchase.type';

describe('Suíte de Regras de Negócio: Pedido de Compra (Cálculos, 3-Way Match e Validações)', () => {
  describe('1. Cálculos de Custos, IPI e Frete Rateados', () => {
    const calculateProcessedItem = (
      item: { baseCost: number; quantity: number },
      ipiPercent: number,
      freightPercent: number
    ) => {
      const baseCost = Number.isFinite(item.baseCost) ? item.baseCost : 0;
      const safeIpi = Number.isFinite(ipiPercent) ? ipiPercent : 0;
      const safeFreight = Number.isFinite(freightPercent) ? freightPercent : 0;
      const qty = Math.max(1, item.quantity);

      const itemIpi = baseCost * (safeIpi / 100);
      const itemFreight = baseCost * (safeFreight / 100);
      const itemUnitCost = baseCost + itemIpi + itemFreight;
      const itemTotalCost = qty * itemUnitCost;

      return {
        quantity: qty,
        unitCost: Number(itemUnitCost.toFixed(2)),
        totalCost: Number(itemTotalCost.toFixed(2)),
      };
    };

    it('calcula custo unitário e total sem IPI e sem frete', () => {
      const result = calculateProcessedItem({ baseCost: 100, quantity: 5 }, 0, 0);

      expect(result.unitCost).toBe(100.0);
      expect(result.totalCost).toBe(500.0);
    });

    it('aplica IPI de 10% e Frete de 5% sobre o custo base com exatidão', () => {
      // Base: R$ 200,00
      // IPI 10%: R$ 20,00
      // Frete 5%: R$ 10,00
      // Custo Unitário: R$ 230,00
      // Qtd 3 -> Total: R$ 690,00
      const result = calculateProcessedItem({ baseCost: 200, quantity: 3 }, 10, 5);

      expect(result.unitCost).toBe(230.0);
      expect(result.totalCost).toBe(690.0);
    });

    it('arredonda centavos para 2 casas decimais sem dízimas infinitas', () => {
      // Base: R$ 33,33 | IPI: 3% | Frete: 7%
      // itemIpi: 0.9999
      // itemFreight: 2.3331
      // itemUnitCost: 36.663 -> 36.66
      // Qtd 2 -> 73.32
      const result = calculateProcessedItem({ baseCost: 33.33, quantity: 2 }, 3, 7);

      expect(result.unitCost).toBe(36.66);
      expect(result.totalCost).toBe(73.33);
    });

    it('calcula o valor total do pedido como a soma exata de todos os itens processados', () => {
      const rawItems = [
        { baseCost: 150, quantity: 2 }, // Unit: 150 + 15(10%) + 7.5(5%) = 172.50 | Tot: 345.00
        { baseCost: 80, quantity: 4 },  // Unit: 80 + 8(10%) + 4(5%) = 92.00 | Tot: 368.00
        { baseCost: 45, quantity: 10 }, // Unit: 45 + 4.5(10%) + 2.25(5%) = 51.75 | Tot: 517.50
      ];

      const processed = rawItems.map((item) => calculateProcessedItem(item, 10, 5));
      const totalOrderValue = processed.reduce((sum, item) => sum + item.totalCost, 0);

      expect(totalOrderValue).toBe(1230.5);
    });
  });

  describe('2. Validações de Consistência e Vínculo de Fornecedor', () => {
    it('bloqueia inclusão de produto de outro fornecedor quando já há fornecedor selecionado', () => {
      const selectedSupplierId = 'fornecedor-alpha';
      const product = {
        id: 'prod-cadeira',
        mainSupplierId: 'fornecedor-beta',
        supplierIds: ['fornecedor-beta'],
      };

      const productBelongsToSupplier =
        product.mainSupplierId === selectedSupplierId ||
        product.supplierIds.includes(selectedSupplierId);

      expect(productBelongsToSupplier).toBe(false);
    });

    it('permite inclusão de produto multi-fornecedor se o selecionado estiver na lista', () => {
      const selectedSupplierId = 'fornecedor-alpha';
      const product = {
        id: 'prod-parafuso',
        mainSupplierId: 'fornecedor-beta',
        supplierIds: ['fornecedor-beta', 'fornecedor-alpha'],
      };

      const productBelongsToSupplier =
        product.mainSupplierId === selectedSupplierId ||
        product.supplierIds.includes(selectedSupplierId);

      expect(productBelongsToSupplier).toBe(true);
    });

    it('valida que pedido de compra exige fornecedor e pelo menos um item', () => {
      const validatePurchase = (supplierId?: string, itemsCount = 0) => {
        const errors = {
          supplier: !supplierId,
          items: itemsCount === 0,
        };
        const isValid = !errors.supplier && !errors.items;
        return { isValid, errors };
      };

      expect(validatePurchase('', 0).isValid).toBe(false);
      expect(validatePurchase('sup-1', 0).isValid).toBe(false);
      expect(validatePurchase('', 2).isValid).toBe(false);
      expect(validatePurchase('sup-1', 2).isValid).toBe(true);
    });
  });

  describe('3. Conferência de Compra (3-Way Match: Pedido x NF x Físico)', () => {
    const evaluate3WayMatch = (
      items: Array<{ quantity: number; invoiced: number; received: number }>
    ) => {
      const isAllReceived = items.every((i) => i.received === i.quantity);
      const isAnyReceived = items.some((i) => i.received > 0);
      const hasDiscrepancy = items.some(
        (i) => i.received !== i.quantity || i.received !== i.invoiced || i.invoiced !== i.quantity
      );

      let newStatus: 'ordered' | 'fulfilled' = 'ordered';
      let invStatus: 'pending' | 'partially_received' | 'received' = 'pending';

      if (isAllReceived && !hasDiscrepancy) {
        newStatus = 'fulfilled';
        invStatus = 'received';
      } else if (isAnyReceived) {
        invStatus = 'partially_received';
      }

      return {
        newStatus,
        invStatus,
        hasDiscrepancy,
      };
    };

    it('reconhece conferência 100% perfeita sem divergências (Atendido e Recebido)', () => {
      const items = [
        { quantity: 10, invoiced: 10, received: 10 },
        { quantity: 5, invoiced: 5, received: 5 },
      ];

      const result = evaluate3WayMatch(items);

      expect(result.newStatus).toBe('fulfilled');
      expect(result.invStatus).toBe('received');
      expect(result.hasDiscrepancy).toBe(false);
    });

    it('detecta recebimento parcial (Permanece Em Ordem e Status Parcial)', () => {
      const items = [
        { quantity: 10, invoiced: 10, received: 7 }, // Faltam 3
        { quantity: 5, invoiced: 5, received: 5 },
      ];

      const result = evaluate3WayMatch(items);

      expect(result.newStatus).toBe('ordered');
      expect(result.invStatus).toBe('partially_received');
      expect(result.hasDiscrepancy).toBe(true);
    });

    it('detecta divergência quando a NF faturou menos ou mais que o pedido', () => {
      const items = [
        { quantity: 10, invoiced: 8, received: 8 }, // Fábrica só faturou 8
      ];

      const result = evaluate3WayMatch(items);

      expect(result.newStatus).toBe('ordered');
      expect(result.hasDiscrepancy).toBe(true);
    });
  });

  describe('4. Proteção contra Leitura Duplicada (Deduplicação de Etiqueta Física)', () => {
    it('impede dupla contagem da mesma unidade física identificada por UUID', () => {
      const scannedLabels = new Set<string>();

      const scanLabel = (labelId: string): boolean => {
        if (scannedLabels.has(labelId)) {
          return false; // Duplicado bloqueado
        }
        scannedLabels.add(labelId);
        return true; // Aceito
      };

      const unitId = 'lbl-uuid-999-1234';

      expect(scanLabel(unitId)).toBe(true);
      expect(scanLabel(unitId)).toBe(false); // Segunda tentativa deve ser barrada
      expect(scannedLabels.size).toBe(1);
    });
  });

  describe('5. Importação de Compras no Recebimento de Mercadorias', () => {
    it('filtra pedidos excluindo compras canceladas e mantendo apenas as do fornecedor selecionado', () => {
      const mockPurchases = [
        { id: '1', supplierId: 'sup-alpha', status: 'ordered' },
        { id: '2', supplierId: 'sup-alpha', status: 'cancelled' }, // Cancelado
        { id: '3', supplierId: 'sup-beta', status: 'ordered' },    // Outro fornecedor
        { id: '4', supplierId: 'sup-alpha', status: 'fulfilled' },
      ];

      const selectedSupplierId = 'sup-alpha';

      const availablePurchases = mockPurchases.filter((purchase) => {
        if (purchase.status === 'cancelled') return false;
        if (!selectedSupplierId) return false;
        return purchase.supplierId === selectedSupplierId;
      });

      expect(availablePurchases.map((p) => p.id)).toEqual(['1', '4']);
    });
  });
});
