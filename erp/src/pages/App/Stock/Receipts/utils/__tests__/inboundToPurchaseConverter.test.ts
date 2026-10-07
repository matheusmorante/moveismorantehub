import { describe, it, expect } from 'vitest';
import { convertInboundToPurchaseItems } from '../inboundToPurchaseConverter';
import { InboundReceiptItem } from '../../components/InboundNfeItemsSection';

describe('inboundToPurchaseConverter', () => {
  describe('Modo Único (1:1)', () => {
    it('deve converter item de NF-e único em PurchaseItem com custos e despesas fiscais unitárias', () => {
      const inboundItem: InboundReceiptItem = {
        itemNumber: 1,
        productCode: 'TAB-001',
        productDescription: 'Tábua de Cedro 3m',
        linkedProductId: 'prod-cedro-uuid',
        linkedVariationId: 'var-cedro-uuid',
        linkedProductName: 'Cedro Rosa 3m Selecionado',
        quantity: 5,
        expectedQuantity: 5,
        unitCost: 100,
        totalCost: 500,
        freightValue: 50, // R$ 10 un
        insuranceValue: 5,
        otherExpensesValue: 10,
        icmsStValue: 10, // Outras despesas fiscais = 25 total -> R$ 5 un
        discountValue: 20, // R$ 4 un
        ipiValue: 25,
        ipiPercent: 5,
      } as any;

      const result = convertInboundToPurchaseItems([inboundItem]);

      expect(result).toHaveLength(1);
      const converted = result[0];
      expect(converted.productId).toBe('prod-cedro-uuid');
      expect(converted.variationId).toBe('var-cedro-uuid');
      expect(converted.description).toBe('Cedro Rosa 3m Selecionado');
      expect(converted.quantity).toBe(5);
      expect(converted.baseCost).toBe(100);
      expect(converted.unitCost).toBe(100);
      expect(converted.totalCost).toBe(500);
      expect(converted.freightFiscalUnit).toBe(10);
      expect(converted.otherExpensesFiscalUnit).toBe(5);
      expect(converted.discountFiscalUnit).toBe(4);
      expect(converted.ipiValue).toBe(25);
      expect(converted.ipiPercent).toBe(5);
    });

    it('deve respeitar fallback da descrição quando não houver produto vinculado', () => {
      const inboundItem: InboundReceiptItem = {
        itemNumber: 2,
        productCode: 'PARAF-01',
        productDescription: 'Parafuso Inox 4.5x50',
        quantity: 100,
        unitCost: 0.2,
        totalCost: 20,
      } as any;

      const result = convertInboundToPurchaseItems([inboundItem]);
      expect(result[0].description).toBe('Parafuso Inox 4.5x50');
      expect(result[0].productId).toBe('');
      expect(result[0].variationId).toBe('');
    });
  });

  describe('Modo Composição (1:N)', () => {
    it('deve desmembrar item em kit/composição com rateio proporcional e absorção exata de resíduo no último item', () => {
      // Exemplo: Conjunto Mesa + 2 Cadeiras vindo na NF-e como 1 item de R$ 100,00
      // 3 componentes com peso idêntico (33.33% cada)
      // Se não houvesse absorção de centavos: 33.33 + 33.33 + 33.33 = 99.99 (perderia 1 centavo)
      const inboundItem: InboundReceiptItem = {
        itemNumber: 1,
        productCode: 'KIT-SALA',
        productDescription: 'Conjunto Sala Jantar',
        quantity: 1,
        expectedQuantity: 1,
        unitCost: 100,
        totalCost: 100,
        freightValue: 10,
        discountValue: 5,
        ipiValue: 5,
        linkMode: 'composition',
        composition: [
          {
            productId: 'p-mesa',
            variationId: 'v-mesa',
            productName: 'Mesa Tampo Vidro',
            quantity: 1,
            referenceSalePrice: 100,
          },
          {
            productId: 'p-cad-1',
            variationId: 'v-cad-1',
            productName: 'Cadeira Estofada 1',
            quantity: 1,
            referenceSalePrice: 100,
          },
          {
            productId: 'p-cad-2',
            variationId: 'v-cad-2',
            productName: 'Cadeira Estofada 2',
            quantity: 1,
            referenceSalePrice: 100,
          },
        ],
      } as any;

      const result = convertInboundToPurchaseItems([inboundItem]);

      expect(result).toHaveLength(3);

      // Soma dos totais de base deve ser rigorosamente 100.00
      const totalBaseSum = result.reduce((s, item) => s + (item.totalCost || 0), 0);
      expect(totalBaseSum).toBe(100);

      // Itens 1 e 2 recebem 33.33
      expect(result[0].totalCost).toBe(33.33);
      expect(result[1].totalCost).toBe(33.33);
      // Item 3 (último) absorveu o centavo residual -> 33.34
      expect(result[2].totalCost).toBe(33.34);

      // Frete: total era 10. 3.33 + 3.33 + 3.34 = 10.00
      const totalFreight = result.reduce((s, item) => s + (item.freightValue || 0), 0);
      expect(Number(totalFreight.toFixed(2))).toBe(10);
      expect(result[2].freightValue).toBe(3.34);

      // IPI: total era 5. 1.67 + 1.67 + 1.66 = 5.00
      const totalIpi = result.reduce((s, item) => s + (item.ipiValue || 0), 0);
      expect(Number(totalIpi.toFixed(2))).toBe(5);
    });
  });
});
