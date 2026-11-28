import { beforeEach, describe, expect, it, vi } from 'vitest';
import { applyProductReconciliationBatchWithClient } from '../../../../../../../shared-utils/productReconciliationBatchMutations';

const ids = {
  product: '11111111-1111-4111-8111-111111111111',
  variation: '22222222-2222-4222-8222-222222222222',
};

const createClient = (responses: Array<{ data: unknown; error: unknown }>) => {
  const queries: Array<{ table: string; calls: unknown[][] }> = [];
  const client = {
    rpc: vi.fn((_name: string, _args: Record<string, unknown>) =>
      Promise.resolve(responses.shift() ?? { data: null, error: null })
    ),
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
    const { client, queries } = createClient([{ data: 1, error: null }]);

    await expect(applyProductReconciliationBatchWithClient(client, {
      operation: 'ncm', productIds: [ids.product], ncm: '9403.50.00',
    })).resolves.toEqual({ success: true, updated: 1 });

    expect(client.rpc).toHaveBeenCalledWith('apply_product_reconciliation_ncm_batch', {
      p_product_ids: [ids.product],
      p_ncm: '94035000',
    });
    expect(client.from).not.toHaveBeenCalled();
    expect(queries).toEqual([]);
  });

  it('confirma os produtos e recria os vínculos ao aplicar categoria em lote', async () => {
    const categoryId = '33333333-3333-4333-8333-333333333333';
    const { client, queries } = createClient([{ data: 1, error: null }]);

    await expect(applyProductReconciliationBatchWithClient(client, {
      operation: 'category', productIds: [ids.product], categoryId,
    })).resolves.toEqual({ success: true, updated: 1 });

    expect(client.rpc).toHaveBeenCalledWith('apply_product_reconciliation_category_batch', {
      p_product_ids: [ids.product],
      p_category_id: categoryId,
    });
    expect(client.from).not.toHaveBeenCalled();
    expect(queries).toEqual([]);
  });

  it('encaminha a atualização de atributos para a operação transacional do banco', async () => {
    const { client, queries } = createClient([{ data: 1, error: null }]);

    await expect(applyProductReconciliationBatchWithClient(client, {
      operation: 'attribute', productIds: [ids.product], name: ' Cor ', value: ' Verde ',
    })).resolves.toEqual({ success: true, updated: 1 });

    expect(client.rpc).toHaveBeenCalledWith('apply_product_reconciliation_attribute_batch', {
      p_product_ids: [ids.product],
      p_name: 'Cor',
      p_value: 'Verde',
    });
    expect(client.from).not.toHaveBeenCalled();
    expect(queries).toEqual([]);
  });

  it('impede a mutação quando a seleção contém produtos repetidos', async () => {
    const { client } = createClient([]);

    await expect(applyProductReconciliationBatchWithClient(client, {
      operation: 'ncm', productIds: [ids.product, ids.product], ncm: '94035000',
    })).resolves.toMatchObject({ success: false, error: 'A seleção contém produtos repetidos.' });
    expect(client.from).not.toHaveBeenCalled();
  });
});
