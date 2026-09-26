import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getOrdersByProductId } from '../orderSearchQueries';

const mockDb = vi.hoisted(() => ({ from: vi.fn() }));

vi.mock('@/pages/utils/supabaseConfig', () => ({ supabase: mockDb }));
vi.mock('./orderMapper', () => ({
    mapOrderFromDatabase: (row: { id: string; deleted?: boolean; order_type?: string }) => ({
        id: row.id,
        deleted: row.deleted,
        orderType: row.order_type,
    }),
}));

const queryResult = (result: { data: unknown[] | null; error: unknown | null }) => {
    const query: any = {
        select: vi.fn(() => query),
        eq: vi.fn(() => query),
        in: vi.fn(() => query),
        neq: vi.fn(() => query),
        order: vi.fn(() => query),
        then: (resolve: (value: typeof result) => unknown) => Promise.resolve(result).then(resolve),
    };
    return query;
};

describe('getOrdersByProductId', () => {
    beforeEach(() => {
        mockDb.from.mockReset();
    });

    it('busca o histórico usando order_items e não consulta order_data', async () => {
        mockDb.from.mockImplementation((table: string) => {
            if (table === 'order_items') {
                return queryResult({ data: [{ order_id: 'order-1' }], error: null });
            }
            if (table === 'orders') {
                return queryResult({ data: [{ id: 'order-1', deleted: false, order_type: 'sale' }], error: null });
            }
            throw new Error(`Tabela inesperada: ${table}`);
        });

        await expect(getOrdersByProductId('product-1')).resolves.toEqual([
            { id: 'order-1', deleted: false, orderType: 'sale' },
        ]);

        expect(mockDb.from.mock.calls.map(([table]) => table)).toEqual(['order_items', 'orders']);
    });

    it('não faz consulta legada quando o produto não existe em order_items', async () => {
        mockDb.from.mockImplementation((table: string) => {
            if (table === 'order_items') {
                return queryResult({ data: [], error: null });
            }
            throw new Error(`Tabela inesperada: ${table}`);
        });

        await expect(getOrdersByProductId('product-1')).resolves.toEqual([]);
        expect(mockDb.from).toHaveBeenCalledTimes(1);
        expect(mockDb.from).toHaveBeenCalledWith('order_items');
    });
});
