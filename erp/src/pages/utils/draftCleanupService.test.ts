import { afterEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  queries: [] as Array<{ table: string; calls: Array<{ method: string; args: unknown[] }> }>,
  results: {} as Record<
    string,
    { error?: { code?: string | null } | null; count?: number | null }
  >,
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
        resolve: (value: { error: { code?: string | null } | null; count: number | null }) => unknown,
        reject?: (reason: unknown) => unknown,
      ) =>
        Promise.resolve(
          mocks.results[table] || { error: null, count: null }
        ).then(resolve, reject);
      mocks.queries.push({ table, calls });
      return query;
    },
  },
}));

import { runDraftCleanup } from './draftCleanupService';

describe('runDraftCleanup', () => {
  afterEach(() => {
    mocks.queries.length = 0;
    mocks.results = {};
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

  it('requests exact affected-row counts for each cleanup mutation', async () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    mocks.results = {
      products: { error: null, count: 2 },
      people: { error: null, count: 3 },
      services: { error: null, count: 4 },
    };

    await runDraftCleanup();

    for (const table of ['products', 'people']) {
      const query = mocks.queries.find((entry) => entry.table === table);
      expect(query?.calls).toContainEqual({
        method: 'update',
        args: [{ deleted: true, active: false }, { count: 'exact' }],
      });
    }
    const servicesQuery = mocks.queries.find((entry) => entry.table === 'services');
    expect(servicesQuery?.calls).toContainEqual({
      method: 'delete',
      args: [{ count: 'exact' }],
    });
    expect(log).toHaveBeenCalledWith('Cleanup de rascunhos antigos finalizado.', {
      products: 2,
      people: 3,
      services: 4,
      servicesTableMissing: false,
    });
  });

  it('stops before later cleanup steps and success logging after a people error', async () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    mocks.results.people = { error: { code: '42501' }, count: null };

    await runDraftCleanup();

    expect(mocks.queries.map((query) => query.table)).toEqual(['products', 'people']);
    expect(log).not.toHaveBeenCalled();
    expect(error).toHaveBeenCalledWith(
      'Erro retornado ao limpar rascunhos em people:',
      { code: '42501' },
    );
  });

  it.each(['PGRST205', '42P01'])(
    'ignores the missing optional services table response (%s)',
    async (code) => {
      const log = vi.spyOn(console, 'log').mockImplementation(() => {});
      vi.spyOn(console, 'error').mockImplementation(() => {});
      mocks.results.services = { error: { code }, count: null };

      await runDraftCleanup();

      expect(log).toHaveBeenCalledWith('Cleanup de rascunhos antigos finalizado.', {
        products: null,
        people: null,
        services: null,
        servicesTableMissing: true,
      });
    },
  );

  it('stops and avoids success logging for a non-missing services error', async () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    mocks.results.services = { error: { code: '42501' }, count: null };

    await runDraftCleanup();

    expect(mocks.queries.map((query) => query.table)).toEqual([
      'products',
      'people',
      'services',
    ]);
    expect(log).not.toHaveBeenCalled();
    expect(error).toHaveBeenCalledWith(
      'Erro retornado ao limpar rascunhos em services:',
      { code: '42501' },
    );
    expect(error).toHaveBeenCalledWith(
      'Erro ao limpar rascunhos antigos:',
      expect.objectContaining({
        message: 'Cleanup de rascunhos interrompido em services (42501).',
      }),
    );
  });
});
