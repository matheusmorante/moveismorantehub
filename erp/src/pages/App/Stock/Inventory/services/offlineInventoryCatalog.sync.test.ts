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
                eq: (column: string, value: unknown) => {
                    filters.push({ operator: 'eq', column, value });
                    state.filters.push({ table, operator: 'eq', column, value });
                    return query;
                },
                range: async (from: number, to: number) => {
                    const rows = (state.rows[table] || []).filter(row => filters.every(filter => {
                        const value = row[filter.column];
                        if (filter.operator === 'gt') return Number(value) > Number(filter.value);
                        if (filter.operator === 'eq') return String(value) === String(filter.value);
                        return String(value) >= String(filter.value);
                    }));
                    return { data: rows.slice(from, to + 1), error: null };
                },
            };
            return query;
        },
    },
}));

import { clearOfflineInventoryCatalogCache, getOfflineInventoryCatalog, syncOfflineInventoryCatalog } from './offlineInventoryCatalog';
import { getWebInventoryDraft, saveWebInventoryDraft } from './inventoryLocalDrafts';
import { freezeInventorySubmission, getInventorySubmission } from './inventoryOutbox';

const firstTimestamp = '2026-09-20T12:00:00.000Z';
const nextTimestamp = '2026-09-25T19:00:00.000Z';
const labelId = '55555555-5555-4555-8555-555555555555';

beforeEach(async () => {
    clearOfflineInventoryCatalogCache();
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
        await saveWebInventoryDraft({ id: 'audit-preserved', code: 'LOCAL-1', date: firstTimestamp,
            name: 'Contagem', responsibleId: 'operator', hasStages: false, status: 'pending_sync',
            items: [{ id: 'count-1', key: 'product-1-variation-1', productId: 'product-1', variationId: 'variation-1',
                name: 'Produto', supplierNames: '', assignedSupplier: '', systemStock: 4, physicalCount: 3, unit: 'UN' }],
            updatedAt: firstTimestamp });
        await freezeInventorySubmission({ contractVersion: 1, auditId: 'audit-preserved', code: 'LOCAL-1',
            observation: { status: 'completed' }, items: [{ physicalCount: 3 }], responsibleName: 'Operador' });

        state.rows.products = [{ id: 'product-1', item_type: 'product', name: 'Produto', active: false, updated_at: nextTimestamp }];
        state.rows.inventory_labels = [];
        state.rows.inventory_catalog_deletions = [{ sequence_id: 1, entity_type: 'label', entity_id: labelId, deleted_at: nextTimestamp }];

        expect((await syncOfflineInventoryCatalog()).success).toBe(true);
        const catalog = await getOfflineInventoryCatalog();

        expect(catalog.products['product-1'].active).toBe(false);
        expect(catalog.labels[labelId]).toBeUndefined();
        expect((await getWebInventoryDraft('audit-preserved'))?.items[0].physicalCount).toBe(3);
        expect((await getInventorySubmission('audit-preserved'))?.items[0].physicalCount).toBe(3);
        expect(state.filters).toContainEqual({ table: 'products', operator: 'gte', column: 'updated_at', value: firstTimestamp });
        expect(state.filters).toContainEqual({ table: 'inventory_catalog_deletions', operator: 'gt', column: 'sequence_id', value: 0 });
        expect(state.filters).toContainEqual({ table: 'products', operator: 'eq', column: 'item_type', value: 'product' });
    });

    it('lê o índice legado e grava a versão nova sem apagar o registro antigo', async () => {
        const db = await new Promise<IDBDatabase>((resolve, reject) => {
            const request = indexedDB.open('morante-inventory', 2);
            request.onupgradeneeded = () => {
                request.result.createObjectStore('catalog', { keyPath: 'id' });
                request.result.createObjectStore('drafts', { keyPath: 'id' });
            };
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
        const legacy = { products: {}, variations: {}, labels: {}, suppliers: {}, cursors: {}, syncedAt: null };
        await new Promise<void>((resolve, reject) => {
            const tx = db.transaction('catalog', 'readwrite');
            tx.objectStore('catalog').put({ id: 'inventory-identification-index', snapshot: legacy });
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        });
        await new Promise<void>((resolve, reject) => {
            const tx = db.transaction('drafts', 'readwrite');
            tx.objectStore('drafts').put({ id: 'audit-legacy', items: [{ physicalCount: 7 }] });
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        });
        db.close();

        expect(await getOfflineInventoryCatalog()).toEqual(legacy);
        expect((await syncOfflineInventoryCatalog()).success).toBe(true);
        const verifyDb = await new Promise<IDBDatabase>((resolve, reject) => {
            const request = indexedDB.open('morante-inventory', 3);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
        const stored = await new Promise<any[]>((resolve, reject) => {
            const tx = verifyDb.transaction('catalog', 'readonly');
            const request = tx.objectStore('catalog').getAll();
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
        verifyDb.close();
        expect(stored.map(row => row.id).sort()).toEqual(['inventory-identification-index', 'inventory-identification-index-v2']);
        expect(stored.find(row => row.id.endsWith('-v2')).snapshot.formatVersion).toBe(2);
        expect(verifyDb.objectStoreNames.contains('outbox')).toBe(true);
        expect((await getWebInventoryDraft('audit-legacy'))?.items[0].physicalCount).toBe(7);
    });
});
