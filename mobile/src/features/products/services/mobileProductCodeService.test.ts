import { beforeEach, describe, expect, it, vi } from 'vitest';

const { supabaseMock } = vi.hoisted(() => ({ supabaseMock: { from: vi.fn() } }));

vi.mock('../../../services/supabaseClient', () => ({ supabase: supabaseMock }));

import { getNextSequentialProductCode } from './mobileProductCodeService';

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
  });

  it('uses product codes and variation SKU prefixes with the ERP ordering and limits', async () => {
    const productsQuery = createQuery({
      data: [{ code: '000126' }, { code: 'TB9999' }],
      error: null,
    });
    const variationsQuery = createQuery({
      data: [{ sku: '000128-02' }, { sku: '000127-01' }],
      error: null,
    });
    supabaseMock.from.mockImplementation((table: string) =>
      table === 'products' ? productsQuery : variationsQuery
    );

    await expect(getNextSequentialProductCode()).resolves.toBe('000129');

    expect(supabaseMock.from.mock.calls).toEqual([['products'], ['product_variations']]);
    expect(productsQuery.select).toHaveBeenCalledWith('code');
    expect(productsQuery.order).toHaveBeenCalledWith('code', { ascending: false });
    expect(productsQuery.limit).toHaveBeenCalledWith(50);
    expect(variationsQuery.select).toHaveBeenCalledWith('sku');
    expect(variationsQuery.order).toHaveBeenCalledWith('sku', { ascending: false });
    expect(variationsQuery.limit).toHaveBeenCalledWith(50);
  });

  it('keeps the six-digit first-code fallback when both queries return no rows', async () => {
    supabaseMock.from.mockImplementation(() => createQuery({ data: [], error: null }));

    await expect(getNextSequentialProductCode()).resolves.toBe('000001');
  });
});
