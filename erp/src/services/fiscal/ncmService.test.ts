import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ rpc: vi.fn(), from: vi.fn() }));

vi.mock('@/pages/utils/supabaseConfig', () => ({
  supabase: { rpc: mocks.rpc, from: mocks.from },
}));

import { ncmService } from './ncmService';

describe('ncmService.searchNcms', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.rpc.mockResolvedValue({
      data: [
        { code: '94036000', rank: 0.4 },
        { code: '84181000', rank: 0.95 },
      ],
      error: null,
    });
    mocks.from.mockImplementation(() => {
      const query: any = {
        select: () => query,
        in: () => query,
        eq: () => query,
        then: (resolve: (value: unknown) => unknown, reject: (reason: unknown) => unknown) =>
          Promise.resolve({
            data: [{ code: '94036000' }, { code: '84181000' }],
            error: null,
          }).then(resolve, reject),
      };
      return query;
    });
  });

  it('retorna primeiro o candidato com maior relevância do catálogo ativo', async () => {
    const results = await ncmService.searchNcms('móvel', 1);

    expect(results.map((result) => result.code)).toEqual(['84181000']);
    expect(mocks.rpc).toHaveBeenCalledWith('search_ncms', {
      search_term: 'móvel',
      max_results: 100,
    });
  });
});
