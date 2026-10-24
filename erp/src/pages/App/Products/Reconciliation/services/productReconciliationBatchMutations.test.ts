import { beforeEach, describe, expect, it, vi } from 'vitest';
import { applyProductReconciliationBatchWithClient } from '../../../../../../../shared-utils/productReconciliationBatchMutations';

const ids = {
  product: '11111111-1111-4111-8111-111111111111',
  variation: '22222222-2222-4222-8222-222222222222',
};

const createClient = (responses: Array<{ data: unknown; error: unknown }>) => {
  const queries: Array<{ table: string; calls: unknown[][] }> = [];
  const client = {
    from: vi.fn((table: string) => {
      const query = { table, calls: [] as unknown[][] };
      queries.push(query);
      const response = responses.shift() ?? { data: null, error: null };
      const builder: any = {
        then(resolve: (value: unknown) => unknown, reject: (reason: unknown) => unknown) {
          return Promise.resolve(response).then(resolve, reject);
        },
      };
      for (const method of ['select', 'eq', 'is', 'in', 'single', 'update', 'delete', 'insert']) {
        builder[method] = (...args: unknown[]) => {
          query.calls.push([method, ...args]);
          return builder;
        };
      }
      return builder;
    }),
  };
  return { client, queries };
};

describe('mutações em lote da conciliação de produtos', () => {
  beforeEach(() => vi.clearAllMocks());

  it('preserva os outros campos fiscais ao aplicar NCM em lote', async () => {
    const { client, queries } = createClient([
      { data: { fiscal: { csosn: '102', cest: '1234567' } }, error: null },
      { data: [{ id: ids.product }], error: null },
    ]);

    await expect(applyProductReconciliationBatchWithClient(client, {
      operation: 'ncm', productIds: [ids.product], ncm: '9403.50.00',
    })).resolves.toEqual({ success: true, updated: 1 });

    expect(queries[0].calls).toContainEqual(['select', 'fiscal']);
    expect(queries[1].calls).toContainEqual(['update', {
      fiscal: { csosn: '102', cest: '1234567', ncm: '94035000' },
    }]);
  });

  it('confirma os produtos e recria os vínculos ao aplicar categoria em lote', async () => {
    const categoryId = '33333333-3333-4333-8333-333333333333';
    const { client, queries } = createClient([
      { data: [{ id: ids.product }], error: null },
      { data: null, error: null },
      { data: null, error: null },
    ]);

    await expect(applyProductReconciliationBatchWithClient(client, {
      operation: 'category', productIds: [ids.product], categoryId,
    })).resolves.toEqual({ success: true, updated: 1 });

    expect(queries.map(({ table }) => table)).toEqual(['products', 'product_categories', 'product_categories']);
    expect(queries[2].calls).toContainEqual(['insert', [{ product_id: ids.product, category_id: categoryId }]]);
  });

  it('preserva metadados existentes ao atualizar atributos de todas as variações do lote', async () => {
    const { client, queries } = createClient([
      { data: [{ id: ids.variation, product_id: ids.product, attributes: [{ name: 'Cor', value: 'Azul', showName: false, legacyOrigin: 'ERP' }] }], error: null },
      { data: [{ id: ids.variation }], error: null },
    ]);

    await expect(applyProductReconciliationBatchWithClient(client, {
      operation: 'attribute', productIds: [ids.product], name: 'Cor', value: 'Verde',
    })).resolves.toEqual({ success: true, updated: 1 });

    expect(queries[1].calls).toContainEqual(['update', {
      attributes: [{ name: 'Cor', value: 'Verde', showName: false, legacyOrigin: 'ERP' }],
    }]);
  });

  it('impede a mutação quando a seleção contém produtos repetidos', async () => {
    const { client } = createClient([]);

    await expect(applyProductReconciliationBatchWithClient(client, {
      operation: 'ncm', productIds: [ids.product, ids.product], ncm: '94035000',
    })).resolves.toMatchObject({ success: false, error: 'A seleção contém produtos repetidos.' });
    expect(client.from).not.toHaveBeenCalled();
  });
});
