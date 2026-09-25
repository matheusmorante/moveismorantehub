import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
    rows: {} as Record<string, Array<Record<string, unknown>>>,
    filters: [] as Array<{ table: string; operator: string; column: string; value: unknown }>,
}));

vi.mock('@/pages/utils/supabaseConfig', () => ({
    supabase: {
        from: (table: string) => {
            const filters: Array<{ operator: string; column: string; value: unknown }> = [];
            const query: any = {
                select: () => query,
                order: () => query,
                gt: (column: string, value: unknown) => {
                    filters.push({ operator: 'gt', column, value });
                    state.filters.push({ table, operator: 'gt', column, value });
                    return query;
                },
                gte: (column: string, value: unknown) => {
                    filters.push({ operator: 'gte', column, value });
                    state.filters.push({ table, operator: 'gte', column, value });
                    return query;
                },
                range: async (from: number, to: number) => {
                    const rows = (state.rows[table] || []).filter(row => filters.every(filter => {
                        const value = row[filter.column];
                        return filter.operator === 'gt' ? Number(value) > Number(filter.value) : String(value) >= String(filter.value);
                    }));
                    return { data: rows.slice(from, to + 1), error: null };
                },
            };
            return query;
        },
    },
}));

import { getOfflineInventoryCatalog, syncOfflineInventoryCatalog } from './offlineInventoryCatalog';

const firstTimestamp = '2026-09-20T12:00:00.000Z';
const nextTimestamp = '2026-09-25T19:00:00.000Z';
const labelId = '55555555-5555-4555-8555-555555555555';

beforeEach(async () => {
    await new Promise<void>((resolve, reject) => {
        const request = indexedDB.deleteDatabase('morante-inventory');
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
        request.onblocked = () => reject(new Error('IndexedDB permaneceu bloqueado no teste'));
    });
    state.filters = [];
    state.rows = {
        products: [{ id: 'product-1', item_type: 'product', name: 'Produto', active: true, updated_at: firstTimestamp }],
        product_variations: [{ id: 'variation-1', product_id: 'product-1', name: 'Variação', sku: 'SKU-1', active: true, updated_at: firstTimestamp }],
        inventory_labels: [{ id: labelId, product_id: 'product-1', variation_id: 'variation-1', status: 'active', updated_at: firstTimestamp }],
        people: [],
        inventory_catalog_deletions: [],
    };
});

describe('sincronização incremental do índice offline web', () => {
    it('atualiza registros alterados desde o cursor e aplica tombstones de etiquetas', async () => {
        expect((await syncOfflineInventoryCatalog()).success).toBe(true);
        expect((await getOfflineInventoryCatalog()).labels[labelId]).toBeTruthy();

        state.rows.products = [{ id: 'product-1', item_type: 'product', name: 'Produto', active: false, updated_at: nextTimestamp }];
        state.rows.inventory_labels = [];
        state.rows.inventory_catalog_deletions = [{ sequence_id: 1, entity_type: 'label', entity_id: labelId, deleted_at: nextTimestamp }];

        expect((await syncOfflineInventoryCatalog()).success).toBe(true);
        const catalog = await getOfflineInventoryCatalog();

        expect(catalog.products['product-1'].active).toBe(false);
        expect(catalog.labels[labelId]).toBeUndefined();
        expect(state.filters).toContainEqual({ table: 'products', operator: 'gte', column: 'updated_at', value: firstTimestamp });
        expect(state.filters).toContainEqual({ table: 'inventory_catalog_deletions', operator: 'gt', column: 'sequence_id', value: 0 });
    });
});
