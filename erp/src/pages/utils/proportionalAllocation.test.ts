import { describe, expect, it } from 'vitest';
import {
    allocateAmountProportionally,
    allocateParameterProportionally,
    calculateItemGrossValue,
} from './proportionalAllocation';

describe('proportionalAllocation', () => {
    it('calcula valor bruto do item corretamente', () => {
        expect(calculateItemGrossValue(3, 150.5)).toBe(451.5);
        expect(calculateItemGrossValue(0, 100)).toBe(0);
        expect(calculateItemGrossValue(2, 0)).toBe(0);
    });

    it('rateia valor fixo proporcionalmente garantindo fechamento em centavos', () => {
        // Três itens: R$ 100, R$ 100, R$ 100 (total R$ 300). Rateio de R$ 10,00
        const allocations = allocateAmountProportionally(10, [100, 100, 100]);
        // 10 / 3 = 3.33 cada, resto 0.01 vai para o último
        expect(allocations[0]).toBe(3.33);
        expect(allocations[1]).toBe(3.33);
        expect(allocations[2]).toBe(3.34);
        const sum = Number((allocations[0] + allocations[1] + allocations[2]).toFixed(2));
        expect(sum).toBe(10);
    });

    it('produz o mesmo resultado tanto em % quanto em R$ equivalente', () => {
        // Total bruto: R$ 10.000
        // Item 1: R$ 2.000 (20%)
        // Item 2: R$ 8.000 (80%)
        const itemsBase = [2000, 8000];

        // 10% de frete em percentual
        const allocPercent = allocateParameterProportionally('percent', 10, itemsBase);
        // R$ 1.000 de frete em valor fixo
        const allocFixed = allocateParameterProportionally('fixed', 1000, itemsBase);

        expect(allocPercent[0]).toBe(200);
        expect(allocPercent[1]).toBe(800);
        expect(allocFixed[0]).toBe(200);
        expect(allocFixed[1]).toBe(800);
        expect(allocPercent).toEqual(allocFixed);
    });

    it('garante independência das bases: frete, despesas e descontos sobre o valor bruto', () => {
        // Base de 2 itens:
        // Item A: 2 un x R$ 100 = R$ 200 (20%)
        // Item B: 1 un x R$ 800 = R$ 800 (80%)
        // Total bruto = R$ 1.000
        const itemsBase = [200, 800];

        // Frete: 5% = R$ 50
        const freightAlloc = allocateParameterProportionally('percent', 5, itemsBase);
        // Desconto: R$ 100 fixo = 10%
        const discountAlloc = allocateParameterProportionally('fixed', 100, itemsBase);
        // Outras despesas: 2% = R$ 20
        const otherAlloc = allocateParameterProportionally('percent', 2, itemsBase);

        // O frete do Item A deve ser 5% de 200 = R$ 10 (não sobre valor descontado!)
        expect(freightAlloc[0]).toBe(10);
        expect(freightAlloc[1]).toBe(40);

        // O desconto do Item A deve ser R$ 20
        expect(discountAlloc[0]).toBe(20);
        expect(discountAlloc[1]).toBe(80);

        // Outras despesas do Item A deve ser R$ 4
        expect(otherAlloc[0]).toBe(4);
        expect(otherAlloc[1]).toBe(16);
    });

    it('lida perfeitamente com valores zerados ou lista vazia sem erros', () => {
        expect(allocateParameterProportionally('percent', 0, [100, 200])).toEqual([0, 0]);
        expect(allocateParameterProportionally('fixed', 0, [100, 200])).toEqual([0, 0]);
        expect(allocateParameterProportionally('fixed', 50, [])).toEqual([]);
        expect(allocateAmountProportionally(50, [0, 0])).toEqual([0, 0]);
    });
});
