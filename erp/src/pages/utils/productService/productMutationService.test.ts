import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  bulkMoveToTrash,
  bulkRestoreProducts,
  saveProduct,
  updateProduct,
} from './productMutationService';
import { activateProduct, deactivateProduct } from './productDependencyCheck';
import {
  HML_FISCAL_TEST_ORDER_MARKER,
  TEST_PRODUCT_CATALOG_PUBLICATION_ERROR,
} from '../hmlTestData';
import { bindTestArtifactContext, clearTestArtifactContext } from '../../../../../shared-utils/testArtifactContext';
import type Product from '../../types/product.type';

const mockDb = vi.hoisted(() => ({
  from: vi.fn(),
  productKind: 'normal',
  databaseProducts: [] as any[],
  productObservations: undefined as string | undefined,
  syncCalls: [] as any[][],
  invalidateQueries: vi.fn(),
  failProductUpdateId: null as string | null,
  failUpdateTable: null as string | null,
}));
vi.mock('@/pages/utils/supabaseConfig', () => ({ supabase: mockDb }));
vi.mock('@/lib/queryClient', () => ({ queryClient: { invalidateQueries: mockDb.invalidateQueries } }));
vi.mock('./productLocalCache', () => ({
  getLocalProducts: vi.fn(() => []),
  saveLocalProducts: vi.fn(),
  notifySubscribers: vi.fn(),
}));
vi.mock('./productPersistenceService', () => ({
  ensureUuidFormat: (product: any) => product.id || crypto.randomUUID(),
  syncProductToSupabase: vi.fn(async (...args: any[]) => { mockDb.syncCalls.push(args); }),
}));

describe('productMutationService - Sincronização de active entre pai e variações', () => {
  const updates: Array<{ table: string; value: any; filter: any }> = [];

  beforeEach(() => {
    updates.length = 0;
    mockDb.productKind = 'normal';
    mockDb.databaseProducts = [];
    mockDb.productObservations = undefined;
    mockDb.syncCalls.length = 0;
    mockDb.invalidateQueries.mockClear();
    mockDb.failProductUpdateId = null;
    mockDb.failUpdateTable = null;
    mockDb.from.mockImplementation((table: string) => {
      let updateWasCalled = false;
      const chain: any = {
        update: vi.fn((val: any) => {
          updateWasCalled = true;
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
        limit: vi.fn(() => chain),
        select: vi.fn(() => chain),
        single: vi.fn(async () => {
          const lastUpdate = updates[updates.length - 1];
          if (
            table === 'products' &&
            lastUpdate?.filter?.val === mockDb.failProductUpdateId
          ) {
            return { data: null, error: new Error('falha ao persistir produto') };
          }
          return { data: { id: 'test' }, error: null };
        }),
        maybeSingle: vi.fn(async () => ({
          data: {
            product_kind: mockDb.productKind,
            observations: mockDb.productObservations,
          },
          error: null,
        })),
        then: (resolve: (val: any) => any) =>
          Promise.resolve({
            data: mockDb.databaseProducts,
            error: updateWasCalled && mockDb.failUpdateTable === table
              ? new Error(`falha ao persistir ${table}`)
              : null,
          }).then(resolve),
      };
      return chain;
    });
  });

  it('deactivateProduct atualiza products e product_variations para false', async () => {
    const uuid = 'b9f1bb8a-8e5a-48c5-ab8c-e065f3ea4078';
    await deactivateProduct(uuid);

    const variationUpdate = updates.find((u) => u.table === 'product_variations');
    expect(variationUpdate).toBeDefined();
    expect(variationUpdate?.value).toEqual({ active: false });
    expect(variationUpdate?.filter).toEqual({ col: 'product_id', val: uuid });
  });

  it('bulkMoveToTrash invalida a lista uma vez depois de concluir o lote', async () => {
    await bulkMoveToTrash([
      'b9f1bb8a-8e5a-48c5-ab8c-e065f3ea4078',
      'c9f1bb8a-8e5a-48c5-ab8c-e065f3ea4079',
    ]);

    expect(mockDb.invalidateQueries).toHaveBeenCalledTimes(1);
    expect(mockDb.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['products'] });
  });

  it('bulkMoveToTrash informa sucesso parcial e invalida depois de todas as tentativas', async () => {
    const failedId = 'c9f1bb8a-8e5a-48c5-ab8c-e065f3ea4079';
    mockDb.failProductUpdateId = failedId;

    const result = await bulkMoveToTrash([
      'b9f1bb8a-8e5a-48c5-ab8c-e065f3ea4078',
      failedId,
    ]);

    expect(result.successCount).toBe(1);
    expect(result.errorCount).toBe(1);
    expect(result.errors).toContain(`Produto ID ${failedId}: falha ao persistir produto`);
    expect(mockDb.invalidateQueries).toHaveBeenCalledTimes(1);
  });

  it('activateProduct impede reativar um Salvado', async () => {
    mockDb.productKind = 'salvado';
    await expect(activateProduct('b9f1bb8a-8e5a-48c5-ab8c-e065f3ea4078')).rejects.toThrow(
      'Produtos do tipo Salvado permanecem desativados no ERP.'
    );
    expect(updates).toEqual([]);
  });

  it('activateProduct atualiza products e product_variations para true', async () => {
    const uuid = 'b9f1bb8a-8e5a-48c5-ab8c-e065f3ea4078';
    await activateProduct(uuid);

    const variationUpdate = updates.find((u) => u.table === 'product_variations');
    expect(variationUpdate).toBeDefined();
    expect(variationUpdate?.value).toEqual({ active: true });
    expect(variationUpdate?.filter).toEqual({ col: 'product_id', val: uuid });
  });

  it('bulkRestoreProducts persiste active = true tanto no pai quanto nas variações', async () => {
    const uuids = ['b9f1bb8a-8e5a-48c5-ab8c-e065f3ea4078'];
    await bulkRestoreProducts(uuids);

    const parentUpdate = updates.find((u) => u.table === 'products' && u.value.active === true);
    expect(parentUpdate).toBeDefined();
    expect(parentUpdate?.value.active).toBe(true);

    const variationUpdate = updates.find((u) => u.table === 'product_variations');
    expect(variationUpdate).toBeDefined();
    expect(variationUpdate?.value).toEqual({ active: true });
    expect(variationUpdate?.filter).toEqual({ col: 'product_id', vals: uuids });
    expect(mockDb.invalidateQueries).toHaveBeenCalledTimes(1);
    expect(mockDb.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['products'] });
  });

  it('propaga falha nas variações, invalida a lista e não confirma cache local', async () => {
    const { saveLocalProducts } = await import('./productLocalCache');
    mockDb.failUpdateTable = 'product_variations';

    await expect(
      bulkRestoreProducts(['b9f1bb8a-8e5a-48c5-ab8c-e065f3ea4078'])
    ).rejects.toThrow('falha ao persistir product_variations');

    expect(mockDb.invalidateQueries).toHaveBeenCalledOnce();
    expect(saveLocalProducts).not.toHaveBeenCalled();
  });

  it('bulkRestoreProducts restaura Salvado sem ativá-lo no ERP', async () => {
    const uuid = 'b9f1bb8a-8e5a-48c5-ab8c-e065f3ea4078';
    mockDb.databaseProducts = [{ id: uuid, product_kind: 'salvado' }];
    await bulkRestoreProducts([uuid]);

    expect(
      updates.some((update) => update.table === 'products' && update.value.active === true)
    ).toBe(false);
    expect(
      updates.some(
        (update) => update.table === 'product_variations' && update.value.active === true
      )
    ).toBe(false);
  });

  it('saveProduct recusa produto de teste com status publicado antes de persistir', async () => {
    const testProduct = {
      description: 'Item sintético',
      observations: `Fixture ${HML_FISCAL_TEST_ORDER_MARKER}`,
      status: 'published',
      variations: [{ status: 'hidden' }],
    } as Product;

    await expect(saveProduct(testProduct)).rejects.toThrow(TEST_PRODUCT_CATALOG_PUBLICATION_ERROR);
    expect(updates).toEqual([]);
  });

  it('carimba a criação de produto e exige insert-only durante uma execução identificada', async () => {
    const ownerId = '550e8400-e29b-41d4-a716-446655440001';
    const runId = '550e8400-e29b-41d4-a716-446655440000';
    const values = new Map<string, string>();
    Object.defineProperty(globalThis, 'sessionStorage', {
      configurable: true,
      value: {
        getItem: (key: string) => values.get(key) ?? null,
        setItem: (key: string, value: string) => values.set(key, value),
        removeItem: (key: string) => values.delete(key),
      },
    });
    bindTestArtifactContext({ runId, ownerId });

    await saveProduct({
      id: '550e8400-e29b-41d4-a716-446655440020',
      name: 'Sofá de teste',
      description: 'Sofá de teste',
      code: '000000',
      unitPrice: 2000,
      stock: 1,
      status: 'hidden',
      isDraft: false,
    } as Product, true);

    expect(mockDb.syncCalls).toHaveLength(1);
    expect(mockDb.syncCalls[0][0].technicalSpecs.testArtifact)
      .toEqual({ is_test: true, runId, ownerId });
    expect(mockDb.syncCalls[0][1]).toEqual({ insertOnly: true });
    clearTestArtifactContext();
  });

  it('updateProduct recusa publicação parcial quando o registro no banco está marcado como teste', async () => {
    const uuid = 'b9f1bb8a-8e5a-48c5-ab8c-e065f3ea4078';
    mockDb.productObservations = `Fixture ${HML_FISCAL_TEST_ORDER_MARKER}`;

    await expect(updateProduct(uuid, { status: 'published' })).rejects.toThrow(
      TEST_PRODUCT_CATALOG_PUBLICATION_ERROR
    );
    expect(updates).toEqual([]);
  });
});
