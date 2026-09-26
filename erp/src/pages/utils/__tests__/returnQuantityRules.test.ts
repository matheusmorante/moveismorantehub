import { describe, expect, it } from 'vitest';
import { getReturnableQuantities } from '../returnQuantityRules';
import type { Item } from '../../types/items.type';

const item = (overrides: Partial<Item> = {}): Item => ({
    description: 'Cadeira', quantity: 4, unitPrice: 100, unitDiscount: 0,
    discountType: 'fixed', handlingType: '', productId: 'p1', variationId: 'v1', ...overrides,
});

describe('getReturnableQuantities', () => {
    it('subtrai devoluções parciais anteriores da linha original', () => {
        expect(getReturnableQuantities([item()], [
            { status: 'fulfilled', items: [{ ...item(), quantity: 1, originalOrderItemIndex: 0 }] },
            { status: 'scheduled', items: [{ ...item(), quantity: 2, originalOrderItemIndex: 0 }] },
        ])).toEqual([1]);
    });

    it('ignora devoluções canceladas e aloca linhas antigas sem origem por assinatura', () => {
        expect(getReturnableQuantities([item(), item({ orderItemId: 'second' })], [
            { status: 'cancelled', items: [{ ...item(), quantity: 4, originalOrderItemIndex: 0 }] },
            { status: 'fulfilled', items: [{ ...item(), quantity: 3 }] },
        ])).toEqual([1, 4]);
    });

    it('não retorna saldo negativo em registros históricos inconsistentes', () => {
        expect(getReturnableQuantities([item({ quantity: 2 })], [
            { status: 'fulfilled', items: [{ ...item(), quantity: 5, originalOrderItemIndex: 0 }] },
        ])).toEqual([0]);
    });
});
