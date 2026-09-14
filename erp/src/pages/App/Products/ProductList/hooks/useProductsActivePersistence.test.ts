import { beforeEach, expect, it, vi } from 'vitest';
import { persistProductActiveState, syncParentActiveInDb } from './useProductsActivePersistence';
import { mapFromDB } from '@/pages/utils/productService/productMapper';

const db = vi.hoisted(() => ({ from: vi.fn() }));
vi.mock('@/pages/utils/supabaseConfig', () => ({ supabase: db }));
vi.mock('@/pages/utils/productService', () => ({ updateProduct: vi.fn() }));

const parentId = '12c8a584-66ce-47b3-af0b-c9dd78aecbaa';
const product = () => mapFromDB({ id: parentId, code: 'ORIG', name: 'Produto teste', active: true, product_variations: [] });
const writes: Array<{ table: string; value: unknown }> = [];
let actualVariations: { id: string }[] = [];
let queryError: Error | null = null;
beforeEach(() => {
    actualVariations = []; queryError = null; writes.length = 0;
    db.from.mockImplementation((table: string) => {
        const chain = {
            select: vi.fn(() => chain),
            eq: vi.fn(() => chain),
            update: vi.fn((value: unknown) => { writes.push({ table, value }); return chain; }),
            limit: vi.fn(async () => ({ data: actualVariations, error: queryError })),
            maybeSingle: vi.fn(async () => ({ data: { id: parentId }, error: queryError })),
            then: (resolve: (value: unknown) => unknown) => Promise.resolve({ data: [], error: queryError }).then(resolve),
        };
        return chain;
    });
});

it('desativa o produto real quando a linha representa a variação virtual', async () => {
    const parent = product();
    expect(parent.variations?.[0].isVirtual).toBe(true);
    await persistProductActiveState(parent.variations![0].id, false, [parent], [parent]);
    expect(writes).toEqual([{ table: 'products', value: { active: false } }]);
});

it('não altera o pai se uma variação real foi criada após carregar a lista', async () => {
    actualVariations = [{ id: 'nova-variacao' }];
    const parent = product();
    await expect(persistProductActiveState(parent.variations![0].id, false, [parent], [parent])).rejects.toThrow('Atualize a lista');
    expect(writes).toEqual([]);
});

it('mantém o erro para uma variação legada real ausente sem desativar o pai', async () => {
    const parent = product();
    parent.variations![0].isVirtual = false;
    await expect(persistProductActiveState(parent.variations![0].id, false, [parent], [parent])).rejects.toThrow('variação não foi encontrada');
    expect(writes.every(write => write.table !== 'products')).toBe(true);
});

it('não desativa o pai quando falha a leitura das variações', async () => {
    queryError = new Error('Falha de conexão');
    await expect(syncParentActiveInDb(parentId)).rejects.toThrow('Falha de conexão');
    expect(writes).toEqual([]);
});
