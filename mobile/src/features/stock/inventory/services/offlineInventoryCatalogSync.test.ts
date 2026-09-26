import { beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
  snapshot: null as any,
  readFailures: 0,
  requests: [] as string[],
  filters: [] as Array<{ table: string; column: string; value: unknown; operator: string }>,
  deletionDenied: true,
  rows: {
    products: [{ id: 'product-new', item_type: 'product', name: 'Mesa', active: true, main_supplier_id: 'supplier-new', updated_at: '2026-09-25T12:00:00Z' }],
    product_variations: [{ id: 'variation-new', product_id: 'product-new', name: 'Mesa azul', stock: 3, active: true, updated_at: '2026-09-25T12:00:00Z' }],
    inventory_labels: [],
    people: [{ id: 'supplier-new', person_type: 'suppliers', full_name: 'Fábrica Nova', updated_at: '2026-09-25T12:00:00Z' }],
    inventory_catalog_deletions: [],
  } as Record<string, any[]>,
}));

vi.mock('../../../../services/supabaseClient', () => ({
  supabase: {
    from: (table: string) => {
      const filters: Array<{ column: string; value: unknown; operator: string }> = [];
      const query: any = {};
      query.select = () => query;
      query.order = () => query;
      for (const operator of ['gte', 'gt', 'eq']) query[operator] = (column: string, value: unknown) => {
        filters.push({ column, value, operator });
        state.filters.push({ table, column, value, operator });
        return query;
      };
      query.range = async () => {
        state.requests.push(table);
        return table === 'inventory_catalog_deletions' && state.deletionDenied
          ? { data: null, error: { code: '42501', message: 'permission denied' } }
          : { data: (state.rows[table] || []).filter(row => filters.every(filter => {
            const current = row[filter.column];
            if (filter.operator === 'gt') return Number(current) > Number(filter.value);
            if (filter.operator === 'gte') return String(current) >= String(filter.value);
            return String(current) === String(filter.value);
          })), error: null };
      };
      return query;
    },
  },
}));
vi.mock('../../../../services/offline/connectivityService', () => ({ connectivityService: { connected: true } }));
vi.mock('../../../../services/sqlite/inventoryCatalog', () => ({
  getLocalInventoryCatalogSnapshot: async () => {
    if (state.readFailures-- > 0) throw new Error('SQLite indisponível');
    return state.snapshot;
  },
  saveLocalInventoryCatalogSnapshot: async (snapshot: unknown) => { state.snapshot = snapshot; },
}));

import { clearOfflineInventoryCatalogCache, getOfflineInventoryCatalog, getOfflineInventoryScopeProducts, syncOfflineInventoryCatalog } from './offlineInventoryCatalog';
import { fetchInventoryScopeProducts, fetchInventoryScopeSuppliers } from '../../../../services/stock/stockInventoryService';

beforeEach(() => {
  state.snapshot = null;
  state.readFailures = 0;
  state.requests = [];
  state.filters = [];
  state.deletionDenied = true;
  state.rows = {
    products: [{ id: 'product-new', item_type: 'product', name: 'Mesa', active: true, main_supplier_id: 'supplier-new', updated_at: '2026-09-25T12:00:00Z' }],
    product_variations: [{ id: 'variation-new', product_id: 'product-new', name: 'Mesa azul', stock: 3, active: true, updated_at: '2026-09-25T12:00:00Z' }],
    inventory_labels: [],
    people: [{ id: 'supplier-new', person_type: 'suppliers', full_name: 'Fábrica Nova', updated_at: '2026-09-25T12:00:00Z' }],
    inventory_catalog_deletions: [],
  };
  clearOfflineInventoryCatalogCache();
});

describe('sincronização do catálogo local de inventário', () => {
  it('persiste produtos e fornecedores no SQLite mesmo sem acesso ao log de exclusões', async () => {
    state.rows.products.push({ id: 'service-1', item_type: 'service', name: 'Montagem' });
    state.rows.people.push({ id: 'customer-1', person_type: 'customers', full_name: 'Cliente' });

    expect((await syncOfflineInventoryCatalog()).success).toBe(true);
    expect(Object.keys((await getOfflineInventoryCatalog()).products)).toEqual(['product-new']);
    expect(state.snapshot.suppliers['customer-1']).toBeUndefined();
    expect(await fetchInventoryScopeSuppliers()).toEqual([{ id: 'supplier-new', full_name: 'Fábrica Nova' }]);
    expect(await fetchInventoryScopeProducts('full')).toMatchObject([{ id: 'product-new', variation_id: 'variation-new', stock: 3 }]);
    expect(state.requests).toContain('inventory_catalog_deletions');
    expect(state.filters).toContainEqual({ table: 'products', column: 'item_type', value: 'product', operator: 'eq' });
    expect(state.filters).toContainEqual({ table: 'people', column: 'person_type', value: 'suppliers', operator: 'eq' });
  });

  it('permite nova tentativa após erro inicial ao ler o SQLite', async () => {
    state.readFailures = 1;
    vi.spyOn(console, 'warn').mockImplementation(() => {});

    expect((await syncOfflineInventoryCatalog()).success).toBe(false);
    expect((await syncOfflineInventoryCatalog()).success).toBe(true);
    expect(await getOfflineInventoryScopeProducts()).toHaveLength(1);
  });

  it('aplica exclusões e novos registros por cursor sem baixar o catálogo inteiro novamente', async () => {
    state.deletionDenied = false;
    expect((await syncOfflineInventoryCatalog()).success).toBe(true);
    state.filters = [];
    state.rows.products.push({ id: 'product-later', item_type: 'product', name: 'Armário', updated_at: '2026-09-26T12:00:00Z' });
    state.rows.product_variations.push({ id: 'variation-later', product_id: 'product-later', name: 'Armário branco', updated_at: '2026-09-26T12:00:00Z' });
    state.rows.inventory_catalog_deletions.push({ sequence_id: 1, entity_type: 'variation', entity_id: 'variation-new', deleted_at: '2026-09-26T12:00:00Z' });

    expect((await syncOfflineInventoryCatalog()).success).toBe(true);
    expect(state.snapshot.variations['variation-new'].deleted).toBe(true);
    expect((await getOfflineInventoryScopeProducts()).map(item => item.variation_id)).toEqual(['variation-later']);
    expect(state.filters).toContainEqual({ table: 'products', column: 'updated_at', value: '2026-09-25T12:00:00Z', operator: 'gte' });
    expect(state.filters.some(filter => filter.table === 'products' && filter.operator === 'eq')).toBe(false);
  });
});
