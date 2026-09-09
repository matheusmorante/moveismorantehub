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
});