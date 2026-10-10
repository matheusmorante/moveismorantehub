import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  builder: { order: vi.fn() },
  from: vi.fn(),
  pages: [[{ id: '' }]],
  rangeCalls: [[0, 0]],
  failingPage: -1,
  queryError: new Error('falha simulada'),
}));

vi.mock('@/pages/utils/supabaseConfig', () => ({
  supabase: { from: mocks.from },
}));

import { fetchAssemblyOrderRows } from './assemblyOrderListService';

describe('fetchAssemblyOrderRows', () => {
  beforeEach(() => {
    mocks.pages.length = 0;
    mocks.rangeCalls.length = 0;
    mocks.failingPage = -1;
    mocks.queryError = new Error('falha simulada');
    Object.assign(mocks.builder, {
      select: vi.fn().mockReturnThis(),
      or: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      range: vi.fn((from: number, to: number) => {
        mocks.rangeCalls.push([from, to]);
        return mocks.builder;
      }),
      then: (resolve: (value: unknown) => unknown, reject: (reason: unknown) => unknown) => {
        const pageIndex = mocks.rangeCalls.length - 1;
        if (pageIndex === mocks.failingPage) {
          return Promise.resolve({ data: null, error: mocks.queryError }).then(resolve, reject);
        }
        return Promise.resolve({ data: mocks.pages[pageIndex] || [], error: null }).then(resolve, reject);
      },
    });
    mocks.from.mockReset().mockReturnValue(mocks.builder);
  });

  it('fetches older assembly candidates beyond the first page', async () => {
    const recentRows = Array.from({ length: 50 }, (_, index) => ({ id: `recent-${index}` }));
    const olderScheduledOrder = { id: 'older-scheduled-order' };
    mocks.pages = [recentRows, [olderScheduledOrder]];

    const rows = await fetchAssemblyOrderRows();

    expect(rows).toHaveLength(51);
    expect(rows.at(-1)).toEqual(olderScheduledOrder);
    expect(mocks.rangeCalls).toEqual([[0, 49], [50, 99]]);
    expect(mocks.builder.order).toHaveBeenLastCalledWith('id', { ascending: true });
  });

  it('stops and surfaces database errors on later pages', async () => {
    mocks.pages = [Array.from({ length: 50 }, (_, index) => ({ id: `recent-${index}` }))];
    mocks.failingPage = 1;

    await expect(fetchAssemblyOrderRows()).rejects.toBe(mocks.queryError);
    expect(mocks.rangeCalls).toEqual([[0, 49], [50, 99]]);
  });
});
