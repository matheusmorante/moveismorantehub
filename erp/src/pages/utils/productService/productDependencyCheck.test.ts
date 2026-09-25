import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
    checkProductHasMoves,
    checkProductIsUsed,
    checkProductLinkedToSales,
    checkVariationIsUsed,
} from './productDependencyCheck';

const mockDb = vi.hoisted(() => ({ from: vi.fn() }));

vi.mock('@/pages/utils/supabaseConfig', () => ({ supabase: mockDb }));
vi.mock('./productLocalCache', () => ({
    getLocalProducts: vi.fn(() => []),
    saveLocalProducts: vi.fn(),
    notifySubscribers: vi.fn(),
}));
vi.mock('./productMutationService', () => ({ updateProduct: vi.fn() }));

const queryResult = (result: { data: unknown[] | null; error: unknown | null }) => {
    const query: any = {
        select: vi.fn(() => query),
        eq: vi.fn(() => query),
        filter: vi.fn(() => query),
        limit: vi.fn(() => query),
        then: (resolve: (value: typeof result) => unknown) => Promise.resolve(result).then(resolve),
    };
    return query;
};

describe('checkProductLinkedToSales', () => {
    beforeEach(() => {
        mockDb.from.mockReset();
    });

    it('retorna o pedido quando encontra o produto em order_items', async () => {
        mockDb.from.mockImplementation((table: string) => {
            if (table === 'order_items') {
                return queryResult({ data: [{ id: 'item-1', order_id: 'order-1' }], error: null });
            }
            throw new Error(`Tabela inesperada: ${table}`);
        });

        await expect(checkProductLinkedToSales('produto-1')).resolves.toBe('order-1');
    });

    it('retorna ausência somente após consultar a fonte normalizada', async () => {
        mockDb.from.mockImplementation((table: string) => {
            if (table === 'order_items') {
                return queryResult({ data: [], error: null });
            }
            throw new Error(`Tabela inesperada: ${table}`);
        });

        await expect(checkProductLinkedToSales('produto-1')).resolves.toBeNull();
        expect(mockDb.from).toHaveBeenCalledTimes(1);
        expect(mockDb.from).toHaveBeenCalledWith('order_items');
    });

    it('falha fechada quando a verificação de vínculo apresenta erro', async () => {
        mockDb.from.mockImplementation(() => {
            throw new Error('indisponível');
        });

        await expect(checkProductLinkedToSales('produto-1')).rejects.toThrow('indisponível');
    });

    it('verifica movimentação e pedidos somente nas fontes normalizadas', async () => {
        const productId = '11111111-1111-4111-8111-111111111111';
        mockDb.from.mockImplementation((table: string) => {
            if (table === 'order_items') {
                return queryResult({ data: [{ id: 'item-1' }], error: null });
            }
            if (table === 'inventory_moves') {
                return queryResult({ data: [], error: null });
            }
            throw new Error(`Tabela inesperada: ${table}`);
        });

        await expect(checkProductHasMoves(productId)).resolves.toBe(true);
        expect(mockDb.from).not.toHaveBeenCalledWith('orders');
    });

    it('considera produto usado por order_items sem consultar JSONB legado', async () => {
        const productId = '22222222-2222-4222-8222-222222222222';
        mockDb.from.mockImplementation((table: string) => {
            if (table === 'order_items') {
                return queryResult({ data: [{ id: 'item-1' }], error: null });
            }
            return queryResult({ data: [], error: null });
        });

        await expect(checkProductIsUsed(productId)).resolves.toBe(true);
        expect(mockDb.from).not.toHaveBeenCalledWith('orders');
    });

    it('considera variação usada por order_items sem consultar JSONB legado', async () => {
        const variationId = '33333333-3333-4333-8333-333333333333';
        mockDb.from.mockImplementation((table: string) => {
            if (table === 'order_items') {
                return queryResult({ data: [{ id: 'item-1' }], error: null });
            }
            return queryResult({ data: [], error: null });
        });

        await expect(checkVariationIsUsed(variationId)).resolves.toBe(true);
        expect(mockDb.from).not.toHaveBeenCalledWith('orders');
    });
});
