import { beforeEach, describe, expect, it, vi } from 'vitest';
import { bulkRestoreProducts } from './productMutationService';
import { activateProduct, deactivateProduct } from './productDependencyCheck';

const mockDb = vi.hoisted(() => ({ from: vi.fn() }));
vi.mock('@/pages/utils/supabaseConfig', () => ({ supabase: mockDb }));
vi.mock('./productLocalCache', () => ({
    getLocalProducts: vi.fn(() => []),
    saveLocalProducts: vi.fn(),
    notifySubscribers: vi.fn()
}));

describe('productMutationService - Sincronização de active entre pai e variações', () => {
    const updates: Array<{ table: string; value: any; filter: any }> = [];

    beforeEach(() => {
        updates.length = 0;
        mockDb.from.mockImplementation((table: string) => {
            const chain: any = {
                update: vi.fn((val: any) => {
                    const updateEntry: any = { table, value: val };
                    updates.push(updateEntry);
                    return chain;
                }),
                eq: vi.fn((col: string, val: any) => {
                    const last = updates[updates.length - 1];
                    if (last) last.filter = { col, val };
                    return chain;
                }),
                in: vi.fn((col: string, vals: any[]) => {
                    const last = updates[updates.length - 1];
                    if (last) last.filter = { col, vals };
                    return chain;
                }),
                select: vi.fn(() => chain),
                single: vi.fn(async () => ({ data: { id: 'test' }, error: null })),
                then: (resolve: (val: any) => any) => Promise.resolve({ data: [], error: null }).then(resolve)
            };
            return chain;
        });
    });

    it('deactivateProduct atualiza products e product_variations para false', async () => {
        const uuid = 'b9f1bb8a-8e5a-48c5-ab8c-e065f3ea4078';
        await deactivateProduct(uuid);

        const variationUpdate = updates.find(u => u.table === 'product_variations');
        expect(variationUpdate).toBeDefined();
        expect(variationUpdate?.value).toEqual({ active: false });
        expect(variationUpdate?.filter).toEqual({ col: 'product_id', val: uuid });
    });

    it('activateProduct atualiza products e product_variations para true', async () => {
        const uuid = 'b9f1bb8a-8e5a-48c5-ab8c-e065f3ea4078';
        await activateProduct(uuid);

        const variationUpdate = updates.find(u => u.table === 'product_variations');
        expect(variationUpdate).toBeDefined();
        expect(variationUpdate?.value).toEqual({ active: true });
        expect(variationUpdate?.filter).toEqual({ col: 'product_id', val: uuid });
    });

    it('bulkRestoreProducts persiste active = true tanto no pai quanto nas variações', async () => {
        const uuids = ['b9f1bb8a-8e5a-48c5-ab8c-e065f3ea4078'];
        await bulkRestoreProducts(uuids);

        const parentUpdate = updates.find(u => u.table === 'products');
        expect(parentUpdate).toBeDefined();
        expect(parentUpdate?.value.active).toBe(true);

        const variationUpdate = updates.find(u => u.table === 'product_variations');
        expect(variationUpdate).toBeDefined();
        expect(variationUpdate?.value).toEqual({ active: true });
        expect(variationUpdate?.filter).toEqual({ col: 'product_id', vals: uuids });
    });
});
