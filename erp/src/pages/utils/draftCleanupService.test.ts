import { afterEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  queries: [] as Array<{ table: string; calls: Array<{ method: string; args: unknown[] }> }>,
}));

vi.mock('@/pages/utils/supabaseConfig', () => ({
  supabase: {
    from(table: string) {
      const calls: Array<{ method: string; args: unknown[] }> = [];
      const query: Record<string, unknown> = {};
      for (const method of ['update', 'delete', 'eq', 'lt', 'or']) {
        query[method] = (...args: unknown[]) => {
          calls.push({ method, args });
          return query;
        };
      }
      query.then = (
        resolve: (value: { error: null }) => unknown,
        reject?: (reason: unknown) => unknown,
      ) => Promise.resolve({ error: null }).then(resolve, reject);
      mocks.queries.push({ table, calls });
      return query;
    },
  },
}));

import { runDraftCleanup } from './draftCleanupService';

describe('runDraftCleanup', () => {
  afterEach(() => {
    mocks.queries.length = 0;
    vi.restoreAllMocks();
  });

  it('preserves test artifact drafts in products and customers', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});

    await runDraftCleanup();

    const productQuery = mocks.queries.find(({ table }) => table === 'products');
    const peopleQuery = mocks.queries.find(({ table }) => table === 'people');
    expect(productQuery?.calls).toContainEqual({
      method: 'or',
      args: ['technical_specs->testArtifact->>is_test.is.null,technical_specs->testArtifact->>is_test.neq.true'],
    });
    expect(peopleQuery?.calls).toContainEqual({
      method: 'or',
      args: ['full_address->testArtifact->>is_test.is.null,full_address->testArtifact->>is_test.neq.true'],
    });
  });
});
