import { beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
  snapshot: null as any,
  readFailures: 0,
  requests: [] as string[],
  selections: [] as Array<{ table: string; columns: string }>,
  hangingTables: [] as string[],
  filters: [] as Array<{ table: string; column: string; value: unknown; operator: string }>,
  deletionDenied: true,
  rows: {
    products: [
      {
        id: 'product-new',
        item_type: 'product',
        name: 'Mesa',
        stock: 7,
        active: true,
        main_supplier_id: 'supplier-new',
        updated_at: '2026-09-25T12:00:00Z',
      },
    ],
    product_variations: [
      {
        id: 'variation-new',
        product_id: 'product-new',
        name: 'Mesa azul',
        stock: 3,
        active: true,
        updated_at: '2026-09-25T12:00:00Z',
      },
    ],
    inventory_labels: [],
    people: [
      {
        id: 'supplier-new',
        person_type: 'suppliers',
        full_name: 'Fábrica Nova',
        updated_at: '2026-09-25T12:00:00Z',
      },
      {
        id: 'supplier-salvados',
        person_type: 'suppliers',
        full_name: 'Multiloja Salvados',
        stock_origins: ['salvados'],
        updated_at: '2026-09-25T12:00:00Z',
      },
      {
        id: 'employee-new',
        person_type: 'employees',
        full_name: 'Ana Souza',
        position: 'Estoquista',
        address: JSON.stringify({ role: 'stockist', roles: ['stockist'] }),
        deleted: false,
        updated_at: '2026-09-25T12:00:00Z',
      },
      {
        id: 'employee-ineligible',
        person_type: 'employees',
        full_name: 'Sem acesso',
        position: 'Sem Acesso',
        address: JSON.stringify({ role: 'pending', roles: ['pending'] }),
        deleted: false,
        updated_at: '2026-09-25T12:00:00Z',
      },
    ],
    inventory_catalog_deletions: [],
  } as Record<string, any[]>,
}));

vi.mock('../../../../services/supabaseClient', () => ({
  supabase: {
    from: (table: string) => {
      const filters: Array<{ column: string; value: unknown; operator: string }> = [];
      const orFilters: string[] = [];
      const query: any = {};
      query.select = (columns: string) => {
        state.selections.push({ table, columns });
        return query;
      };
      query.order = () => query;
      query.or = (filter: string) => {
        orFilters.push(filter);
        return query;
      };
      for (const operator of ['gte', 'gt', 'eq'])
        query[operator] = (column: string, value: unknown) => {
          filters.push({ column, value, operator });
          state.filters.push({ table, column, value, operator });
          return query;
        };
      query.range = async () => {
        state.requests.push(table);
        if (state.hangingTables.includes(table)) return new Promise(() => {});
        return table === 'inventory_catalog_deletions' && state.deletionDenied
          ? { data: null, error: { code: '42501', message: 'permission denied' } }
          : {
              data: (state.rows[table] || []).filter((row) =>
                filters.every((filter) => {
                  const current = row[filter.column];
                  if (filter.operator === 'gt') return Number(current) > Number(filter.value);
                  if (filter.operator === 'gte') return String(current) >= String(filter.value);
                  return String(current) === String(filter.value);
                })
              ).filter((row) =>
                orFilters.every((filter) => {
                  if (filter.startsWith('deleted.eq.false'))
                    return row.deleted === false || row.deleted == null;
                  if (filter.includes('person_type.ilike.employees'))
                    return (
                      String(row.person_type || '').toLowerCase() === 'employees' ||
                      Boolean(String(row.position || '').trim())
                    );
                  return true;
                })
              ),
              error: null,
            };
      };
      return query;
    },
  },
}));
vi.mock('../../../../services/offline/connectivityService', () => ({
  connectivityService: { connected: true },
}));
vi.mock('../../../../services/sqlite/inventoryCatalog', () => ({
  getLocalInventoryCatalogSnapshot: async () => {
    if (state.readFailures-- > 0) throw new Error('SQLite indisponível');
    return state.snapshot;
  },
  saveLocalInventoryCatalogSnapshot: async (snapshot: unknown) => {
    state.snapshot = snapshot;
  },
}));

import {
  clearOfflineInventoryCatalogCache,
  getOfflineInventoryCatalog,
  getOfflineInventoryScopeProducts,
  syncOfflineInventoryCatalog,
} from './offlineInventoryCatalog';
import {
  fetchInventoryScopeEmployees,
  fetchInventoryScopeProducts,
  fetchInventoryScopeSuppliers,
} from '../../../../services/stock/stockInventoryService';

beforeEach(() => {
  state.snapshot = null;
  state.readFailures = 0;
  state.requests = [];
  state.selections = [];
  state.hangingTables = [];
  state.filters = [];
  state.deletionDenied = true;
  state.rows = {
    products: [
      {
        id: 'product-new',
        item_type: 'product',
        name: 'Mesa',
        stock: 7,
        active: true,
        main_supplier_id: 'supplier-new',
        updated_at: '2026-09-25T12:00:00Z',
      },
    ],
    product_variations: [
      {
        id: 'variation-new',
        product_id: 'product-new',
        name: 'Mesa azul',
        stock: 3,
        active: true,
        updated_at: '2026-09-25T12:00:00Z',
      },
    ],
    inventory_labels: [],
    people: [
      {
        id: 'supplier-new',
        person_type: 'suppliers',
        full_name: 'Fábrica Nova',
        updated_at: '2026-09-25T12:00:00Z',
      },
      {
        id: 'supplier-salvados',
        person_type: 'suppliers',
        full_name: 'Multiloja Salvados',
        stock_origins: ['salvados'],
        updated_at: '2026-09-25T12:00:00Z',
      },
      {
        id: 'employee-new',
        person_type: 'employees',
        full_name: 'Ana Souza',
        position: 'Estoquista',
        address: JSON.stringify({ role: 'stockist', roles: ['stockist'] }),
        deleted: false,
        updated_at: '2026-09-25T12:00:00Z',
      },
      {
        id: 'employee-ineligible',
        person_type: 'employees',
        full_name: 'Sem acesso',
        position: 'Sem Acesso',
        address: JSON.stringify({ role: 'pending', roles: ['pending'] }),
        deleted: false,
        updated_at: '2026-09-25T12:00:00Z',
      },
    ],
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
    expect(state.snapshot.employees['employee-new']).toMatchObject({
      full_name: 'Ana Souza',
      position: 'Estoquista',
      role: 'stockist',
      roles: ['stockist'],
    });
    expect(state.snapshot.employees['employee-new']).not.toHaveProperty('address');
    expect(state.snapshot.employees['employee-ineligible']).toBeDefined();
    expect(state.snapshot.employees['supplier-new']).toBeUndefined();
    expect(state.snapshot.employees['customer-1']).toBeUndefined();
    expect(state.snapshot.suppliers['supplier-salvados']).toMatchObject({
      stock_origins: ['salvados'],
    });
    expect(await fetchInventoryScopeSuppliers()).toEqual([
      { id: 'supplier-new', full_name: 'Fábrica Nova' },
    ]);
    expect(await fetchInventoryScopeEmployees()).toMatchObject({
      employees: [{ id: 'employee-new', full_name: 'Ana Souza', position: 'Estoquista' }],
    });
    expect(await fetchInventoryScopeProducts('full')).toMatchObject([
      { id: 'product-new', variation_id: 'variation-new', stock: 3 },
    ]);
    expect(state.requests).toContain('inventory_catalog_deletions');
    expect(state.filters).toContainEqual({
      table: 'products',
      column: 'item_type',
      value: 'product',
      operator: 'eq',
    });
    expect(state.filters).toContainEqual({
      table: 'people',
      column: 'person_type',
      value: 'suppliers',
      operator: 'eq',
    });
    expect(state.selections).toContainEqual({
      table: 'people',
      columns:
        'id, person_type, full_name, social_name, nickname, email, position, address, active, deleted, updated_at',
    });
    expect(state.selections).toContainEqual({
      table: 'people',
      columns:
        'id, person_type, full_name, social_name, nickname, stock_origins, active, deleted, updated_at',
    });
    expect(state.selections.some(({ table, columns }) => table === 'people' && columns.includes('->'))).toBe(
      false
    );
  });

  it('permite nova tentativa após erro inicial ao ler o SQLite', async () => {
    state.readFailures = 1;
    vi.spyOn(console, 'warn').mockImplementation(() => {});

    expect((await syncOfflineInventoryCatalog()).success).toBe(false);
    expect((await syncOfflineInventoryCatalog()).success).toBe(true);
    expect(await getOfflineInventoryScopeProducts()).toHaveLength(1);
  });

  it('reconstrói o catálogo antigo para trazer origens de fornecedor antes de liberar o inventário', async () => {
    state.deletionDenied = false;
    state.snapshot = {
      formatVersion: 2,
      products: { stale: { id: 'stale', item_type: 'product', name: 'Obsoleto' } },
      variations: {},
      labels: {},
      suppliers: {
        'supplier-salvados': {
          id: 'supplier-salvados',
          person_type: 'suppliers',
          full_name: 'Multiloja Salvados',
        },
      },
      employees: {},
      cursors: {
        products: '2026-09-24T12:00:00Z',
        variations: '2026-09-24T12:00:00Z',
        labels: '2026-09-24T12:00:00Z',
        suppliers: '2026-09-24T12:00:00Z',
      },
      syncedAt: '2026-09-24T12:00:00Z',
      deletionCursor: 0,
    };
    state.rows.products.push({
      id: 'product-salvados', item_type: 'product', name: 'Mesa Salvados',
      supplier_id: 'supplier-salvados', updated_at: '2026-09-20T12:00:00Z',
    });
    state.rows.product_variations.push({
      id: 'variation-salvados', product_id: 'product-salvados',
      name: 'Mesa Salvados', sku: 'SKU-SALVADOS', updated_at: '2026-09-20T12:00:00Z',
    });

    expect((await syncOfflineInventoryCatalog()).success).toBe(true);
    expect(state.snapshot.formatVersion).toBe(3);
    expect(state.snapshot.products.stale).toBeUndefined();
    expect(state.snapshot.suppliers['supplier-salvados'].stock_origins).toEqual(['salvados']);
    expect(
      state.filters.some(
        (filter) => filter.table === 'people' && filter.column === 'updated_at' && filter.operator === 'gte'
      )
    ).toBe(false);
    expect(await fetchInventoryScopeSuppliers()).toEqual([
      { id: 'supplier-new', full_name: 'Fábrica Nova' },
    ]);
    expect(await getOfflineInventoryScopeProducts()).toEqual([
      expect.objectContaining({ id: 'product-new', variation_id: 'variation-new' }),
    ]);
  });

  it('não usa catálogo antigo quando a sincronização não consegue atualizar as origens', async () => {
    state.snapshot = {
      formatVersion: 2,
      products: {}, variations: {}, labels: {}, suppliers: {}, employees: {},
      cursors: {}, syncedAt: '2026-09-24T12:00:00Z', deletionCursor: 0,
    };

    await expect(fetchInventoryScopeSuppliers()).rejects.toThrow(
      'O catálogo local precisa ser atualizado para conferir as origens dos fornecedores.'
    );
    expect(await getOfflineInventoryScopeProducts()).toEqual([]);
  });

  it('aplica a mudança incremental de origem do fornecedor às etapas do inventário', async () => {
    state.deletionDenied = false;
    expect((await syncOfflineInventoryCatalog()).success).toBe(true);
    expect(await fetchInventoryScopeSuppliers()).toEqual([
      { id: 'supplier-new', full_name: 'Fábrica Nova' },
    ]);

    state.rows.people = state.rows.people.map((person) =>
      person.id === 'supplier-new'
        ? { ...person, stock_origins: ['salvados'], updated_at: '2026-09-26T12:00:00Z' }
        : person
    );

    expect((await syncOfflineInventoryCatalog()).success).toBe(true);
    expect(state.snapshot.suppliers['supplier-new'].stock_origins).toEqual(['salvados']);
    expect(await fetchInventoryScopeSuppliers()).toEqual([]);
    expect(await getOfflineInventoryScopeProducts()).toEqual([]);
  });

  it('aplica exclusões e novos registros por cursor sem baixar o catálogo inteiro novamente', async () => {
    state.deletionDenied = false;
    expect((await syncOfflineInventoryCatalog()).success).toBe(true);
    state.filters = [];
    state.rows.products.push({
      id: 'product-later',
      item_type: 'product',
      name: 'Armário',
      stock: 4,
      updated_at: '2026-09-26T12:00:00Z',
    });
    state.rows.product_variations.push({
      id: 'variation-later',
      product_id: 'product-later',
      name: 'Armário branco',
      updated_at: '2026-09-26T12:00:00Z',
    });
    state.rows.inventory_catalog_deletions.push({
      sequence_id: 1,
      entity_type: 'variation',
      entity_id: 'variation-new',
      deleted_at: '2026-09-26T12:00:00Z',
    });

    expect((await syncOfflineInventoryCatalog()).success).toBe(true);
    expect(state.snapshot.variations['variation-new'].deleted).toBe(true);
    expect((await getOfflineInventoryScopeProducts()).map((item) => item.variation_id)).toEqual([
      'variation-later',
    ]);
    expect(state.filters).toContainEqual({
      table: 'products',
      column: 'updated_at',
      value: '2026-09-25T12:00:00Z',
      operator: 'gte',
    });
    expect(
      state.filters.some((filter) => filter.table === 'products' && filter.operator === 'eq')
    ).toBe(false);
  });

  it('permite repetir a sincronização do responsável após limpar o intervalo de tentativa', async () => {
    state.deletionDenied = false;
    expect((await syncOfflineInventoryCatalog()).success).toBe(true);
    const requestCount = state.requests.length;

    clearOfflineInventoryCatalogCache();
    const result = await fetchInventoryScopeEmployees();

    expect(result.employees).toMatchObject([
      { id: 'employee-new', full_name: 'Ana Souza', position: 'Estoquista' },
    ]);
    expect(state.requests.length).toBeGreaterThan(requestCount);
  });

  it.each(['inventory_catalog_deletions', 'products'])(
    'usa o catálogo salvo quando a consulta remota de %s não responde',
    async (table) => {
      state.deletionDenied = false;
      expect((await syncOfflineInventoryCatalog()).success).toBe(true);
      const cachedSyncedAt = state.snapshot.syncedAt;
      state.hangingTables = [table];
      clearOfflineInventoryCatalogCache();
      vi.spyOn(console, 'warn').mockImplementation(() => {});
      vi.useFakeTimers();

      try {
        const sync = syncOfflineInventoryCatalog();
        await vi.advanceTimersByTimeAsync(10_001);

        await expect(sync).resolves.toEqual({ success: false, syncedAt: cachedSyncedAt });
        expect(await fetchInventoryScopeProducts('full')).toHaveLength(1);
      } finally {
        vi.useRealTimers();
      }
    }
  );
});
