import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NON_TEST_ARTIFACT_FILTER } from '../../../../../shared-utils/testArtifactQueries';

const mockDb = vi.hoisted(() => ({ from: vi.fn() }));

vi.mock('@/pages/utils/supabaseConfig', () => ({ supabase: mockDb }));

import { fetchAssemblyPrintOrders } from '../assemblyPrintOrdersService';

describe('fetchAssemblyPrintOrders', () => {
  beforeEach(() => {
    const query: any = {};
    for (const method of ['select', 'or', 'eq', 'neq', 'order']) {
      query[method] = vi.fn(() => query);
    }
    query.then = (resolve: (value: unknown) => unknown) =>
      Promise.resolve({ data: [], error: null }).then(resolve);
    mockDb.from.mockReset().mockReturnValue(query);
  });

  it('exclui artefatos de teste pela consulta do servidor', async () => {
    await fetchAssemblyPrintOrders();

    const executedQuery = mockDb.from.mock.results[0]?.value;
    expect(mockDb.from).toHaveBeenCalledWith('orders');
    expect(executedQuery.or).toHaveBeenCalledWith(NON_TEST_ARTIFACT_FILTER);
    expect(executedQuery.or.mock.invocationCallOrder[0]).toBeLessThan(
      executedQuery.order.mock.invocationCallOrder[0]
    );
  });
});
