import { describe, expect, it } from 'vitest';
import { calculateReceiptItems } from './goodsReceiptCostCalculation';

describe('goodsReceiptCostCalculation', () => {
    it('prioriza IPI individual e mantém custo unitário e total consistentes', () => {
        const [first, second] = calculateReceiptItems([
            { productId: 'a', description: 'A', quantity: 10, unitCost: 100, totalCost: 1000, fiscalBaseCost: 100, additionalCostUnit: 10, ipiPercent: 3.25 },
            { productId: 'b', description: 'B', quantity: 2, unitCost: 500, totalCost: 1000, fiscalBaseCost: 500, additionalCostUnit: 20, ipiPercent: 7 },
        ], 99, 0);

        expect(first.unitCost).toBe(113.25);
        expect(first.totalCost).toBe(1132.5);
        expect(second.unitCost).toBe(555);
        expect(second.totalCost).toBe(1110);
    });

    it('usa a alíquota global apenas quando o item não informa IPI', () => {
        const [item] = calculateReceiptItems([{ productId: 'a', description: 'A', quantity: 1, unitCost: 100, totalCost: 100 }], 10, 0);
        expect(item.unitCost).toBe(110);
    });

    it('calcula o exemplo exato do usuário: 1 un, R$ 200 custo, R$ 6 IPI (3%), R$ 20 frete (10%) = R$ 226', () => {
        const [item] = calculateReceiptItems([
            { productId: 'prod-1', description: 'Guarda Roupa', quantity: 1, unitCost: 200, totalCost: 200 }
        ], {
            fallbackIpiPercent: 3,
            fallbackFreightPercent: 10,
        });

        expect(item.baseCost).toBe(200);
        expect(item.ipiValue).toBe(6);
        expect(item.freightUnit).toBe(20);
        expect(item.unitCost).toBe(226); // Custo unitário final
        expect(item.totalCost).toBe(226); // Total do item
    });

    it('aplica desconto não fiscal em R$ rateado proporcionalmente entre os itens', () => {
        const [itemA, itemB] = calculateReceiptItems([
            { productId: 'a', description: 'Produto A', quantity: 1, unitCost: 200, totalCost: 200 },
            { productId: 'b', description: 'Produto B', quantity: 1, unitCost: 800, totalCost: 800 },
        ], {
            fallbackIpiPercent: 0,
            fallbackFreightPercent: 0,
            nonFiscalDiscount: { mode: 'fixed', value: 100 }, // R$ 100 de desconto no total de R$ 1000
        });

        // Item A (20% da base) deve receber R$ 20 de desconto -> 200 - 20 = 180
        expect(itemA.discountUnit).toBe(20);
        expect(itemA.netBaseCost).toBe(180);
        expect(itemA.unitCost).toBe(180);
        expect(itemA.totalCost).toBe(180);

        // Item B (80% da base) deve receber R$ 80 de desconto -> 800 - 80 = 720
        expect(itemB.discountUnit).toBe(80);
        expect(itemB.netBaseCost).toBe(720);
        expect(itemB.unitCost).toBe(720);
        expect(itemB.totalCost).toBe(720);
    });

    it('aplica desconto não fiscal em % diretamente sobre o custo unitário', () => {
        const [item] = calculateReceiptItems([
            { productId: 'a', description: 'Produto A', quantity: 2, unitCost: 150, totalCost: 300 }
        ], {
            fallbackIpiPercent: 0,
            fallbackFreightPercent: 0,
            nonFiscalDiscount: { mode: 'percent', value: 10 }, // 10% de desconto
        });

        expect(item.discountUnit).toBe(15);
        expect(item.netBaseCost).toBe(135);
        expect(item.unitCost).toBe(135);
        expect(item.totalCost).toBe(270);
    });

    it('calcula custo unitário final com desconto, IPI, frete e outras despesas rateadas', () => {
        // Exemplo complexo:
        // Item: Qtd 2, Custo Unitário R$ 100, IPI 5% (R$ 5), Frete Não Fiscal R$ 20 fixo (R$ 10 un), Desconto Não Fiscal 10% (R$ 10 un)
        // Custo Unitário Final = 100 - 10 (desc) + 5 (ipi) + 10 (frete) = 105
        // Total do item = 2 * 105 = 210
        const [item] = calculateReceiptItems([
            { productId: 'a', description: 'Mesa', quantity: 2, unitCost: 100, totalCost: 200 }
        ], {
            fallbackIpiPercent: 5,
            fallbackFreightPercent: 0,
            nonFiscalDiscount: { mode: 'percent', value: 10 },
            nonFiscalFreight: { mode: 'fixed', value: 20 },
        });

        expect(item.baseCost).toBe(100);
        expect(item.discountUnit).toBe(10);
        expect(item.netBaseCost).toBe(90);
        expect(item.freightUnit).toBe(10);
        expect(item.unitCost).toBe(105);
        expect(item.totalCost).toBe(210);
    });
});