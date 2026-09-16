import { describe, expect, it } from 'vitest';
import { calculateAdditionalCosts, emptyAdditionalCost, isBlankAdditionalCost } from './additionalCosts';

describe('additionalCosts', () => {
    const items = [
        { itemNumber: 1, totalCost: 2000 },
        { itemNumber: 2, totalCost: 8000 },
    ];

    it('calcula e rateia frete percentual sobre a base dos produtos', () => {
        const result = calculateAdditionalCosts(items, [{ ...emptyAdditionalCost(), description: 'Frete', inputValue: 10 }]);
        expect(result.productsBaseValue).toBe(10000);
        expect(result.costs[0].calculatedAmount).toBe(1000);
        expect(result.costs[0].calculatedRate).toBe(0.1);
        expect(result.allocations.map((item) => item.allocatedAdditionalCosts)).toEqual([200, 800]);
    });

    it('rateia frete fixo fechando exatamente os centavos', () => {
        const result = calculateAdditionalCosts(items, [{ ...emptyAdditionalCost(), description: 'Frete', calculationType: 'fixed', inputValue: 100 }]);
        expect(result.costs[0].calculatedAmount).toBe(100);
        expect(result.costs[0].calculatedRate).toBe(0.01);
        expect(result.allocations.reduce((sum, item) => sum + item.allocatedAdditionalCosts, 0)).toBe(100);
    });

    it('atribui deterministicamente o resíduo de centavos ao último item elegível', () => {
        const result = calculateAdditionalCosts(
            [{ itemNumber: 1, totalCost: 1 }, { itemNumber: 2, totalCost: 1 }, { itemNumber: 3, totalCost: 1 }],
            [{ ...emptyAdditionalCost(), description: 'Frete', calculationType: 'fixed', inputValue: 1 }],
        );
        expect(result.allocations.map((item) => item.allocatedAdditionalCosts)).toEqual([0.33, 0.33, 0.34]);
        expect(result.allocations.reduce((sum, item) => sum + item.allocatedAdditionalCosts, 0)).toBe(1);
    });

    it('acumula percentual e custos fixos sem composição em cascata', () => {
        const result = calculateAdditionalCosts(
            [{ itemNumber: 1, totalCost: 1000 }],
            [
                { ...emptyAdditionalCost(), description: 'Frete', inputValue: 10 },
                { id: 'intermediacao', description: 'Intermediação', calculationType: 'percentage', inputValue: 5 },
                { id: 'descarga', description: 'Descarga', calculationType: 'fixed', inputValue: 200 },
            ],
        );
        expect(result.totalAdditionalCosts).toBe(350);
        expect(result.allocations[0].acquisitionCost).toBe(1350);
    });

    it('mantém custos zerados quando não há adicionais', () => {
        const result = calculateAdditionalCosts([{ itemNumber: 1, totalCost: 100 }]);
        expect(result.totalAdditionalCosts).toBe(0);
        expect(result.allocations[0].totalAdditionalCosts).toBe(0);
    });

    it('ignora a linha inicial completamente vazia', () => {
        const empty = emptyAdditionalCost();
        expect(isBlankAdditionalCost(empty)).toBe(true);
        expect(calculateAdditionalCosts(items, [empty]).costs).toHaveLength(0);
    });
});
