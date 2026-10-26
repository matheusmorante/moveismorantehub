import { beforeEach, describe, expect, it, vi } from 'vitest';

const { supabaseMock, localProductsMock } = vi.hoisted(() => ({
  supabaseMock: { from: vi.fn() },
  localProductsMock: vi.fn(),
}));

vi.mock('@/pages/utils/supabaseConfig', () => ({ supabase: supabaseMock }));
vi.mock('./productLocalCache', () => ({ getLocalProducts: localProductsMock }));

import { getNextSequentialProductCode } from './productSkuService';

const createQuery = (result: unknown) => {
  const query: any = {};
  query.select = vi.fn(() => query);
  query.order = vi.fn(() => query);
  query.limit = vi.fn().mockResolvedValue(result);
  return query;
};

describe('getNextSequentialProductCode', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localProductsMock.mockReturnValue([]);
  });

  it('shares prefix parsing for products, variation SKUs, and the ERP local cache', async () => {
    const productsQuery = createQuery({ data: [{ code: '000145' }], error: null });
    const variationsQuery = createQuery({ data: [{ sku: '000146-01' }], error: null });
    supabaseMock.from.mockImplementation((table: string) =>
      table === 'products' ? productsQuery : variationsQuery
    );
    localProductsMock.mockReturnValue([
      { code: '000144', variations: [{ sku: '000147-01' }] },
    ]);

    await expect(getNextSequentialProductCode()).resolves.toBe('000148');
  });
});
