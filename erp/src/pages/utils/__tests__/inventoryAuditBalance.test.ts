import { beforeEach, describe, expect, it, vi } from 'vitest';

const { supabaseFrom, updateProduct } = vi.hoisted(() => ({
    supabaseFrom: vi.fn(),
    updateProduct: vi.fn(),
}));

vi.mock('../supabaseConfig', () => ({ supabase: { from: supabaseFrom } }));
vi.mock('../productService', () => ({
    mapFromDB: (row: any) => row,
    updateProduct,
}));

import { recalculateInventoryAuditBalance } from '../inventoryAuditBalance';

const queryResult = (result: unknown) => {
    const query: any = {};
    for (const method of ['select', 'eq', 'order', 'limit', 'single']) {
        query[method] = vi.fn(() => query);
    }
    query.then = (resolve: (value: unknown) => unknown, reject?: (reason: unknown) => unknown) =>
        Promise.resolve(result).then(resolve, reject);
    return query;
};

describe('recalculateInventoryAuditBalance', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('restaura o saldo anterior ao estornar o único ajuste de inventário e reaplica movimentos posteriores', async () => {
        const productRow = {
            id: 'product-1',
            stock: 11,
            variations: [{ id: 'variation-1', stock: 11 }],
        };
        const moves = [
            {
                id: 'audit-adjustment',
                variation_id: 'variation-1',
                type: 'adjustment',
                quantity: 0,
                date: '2026-01-02T10:00:00.000Z',
                observation: JSON.stringify({ targetStock: 9, previousStock: 4, status: 'reversed' }),
            },
            {
                id: 'later-entry',
                variation_id: 'variation-1',
                type: 'entry',
                quantity: 2,
                date: '2026-01-03T10:00:00.000Z',
                observation: JSON.stringify({ status: 'effective' }),
            },
        ];

        supabaseFrom.mockImplementation((table: string) => {
            if (table === 'products') return { select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: productRow }) }) }) };
            return queryResult({ data: moves, error: null });
        });

        await expect(recalculateInventoryAuditBalance('product-1')).resolves.toBe(true);
        expect(updateProduct).toHaveBeenCalledWith('product-1', expect.objectContaining({
            stock: 6,
            variations: [{ id: 'variation-1', stock: 6 }],
        }));
    });
});
