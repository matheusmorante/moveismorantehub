import { beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
  response: Promise.resolve({ data: '000001', error: null }) as Promise<any>,
}));

vi.mock('../../supabaseClient', () => ({
  supabase: {
    rpc: () => state.response,
    from: () => {
      const query: any = {
        select: () => query,
        ilike: () => query,
        order: () => query,
        limit: () => query,
        then: (resolve: (value: unknown) => unknown, reject: (error: unknown) => unknown) =>
          state.response.then(resolve, reject),
      };
      return query;
    },
  },
}));
vi.mock('../../offline/offlineStorageService', () => ({ offlineStorageService: {} }));
vi.mock('../../sqlite/inventoryDrafts', () => ({ getLocalInventoryDraft: vi.fn() }));
vi.mock('../../sqlite/inventoryOutbox', () => ({ getInventorySubmission: vi.fn() }));
vi.mock('../stockMovesService', () => ({ ITEMS_PER_PAGE: 20, getStockPeriod: vi.fn() }));

import { getNextInventoryCode } from './inventorySessionQueryService';

describe('getNextInventoryCode', () => {
  beforeEach(() => {
    state.response = Promise.resolve({ data: '000001', error: null });
  });

  it('usa o código devolvido pelo alocador atômico', async () => {
    state.response = Promise.resolve({
      data: '000042',
      error: null,
    });

    await expect(getNextInventoryCode()).resolves.toBe('000042');
  });

  it('falha após o timeout para permitir ao fluxo criar um código local', async () => {
    state.response = new Promise(() => {});
    vi.useFakeTimers();

    try {
      const request = getNextInventoryCode();
      const rejection = expect(request).rejects.toThrow('excedeu 5000ms');
      await vi.advanceTimersByTimeAsync(5_001);
      await rejection;
    } finally {
      vi.useRealTimers();
    }
  });
});
