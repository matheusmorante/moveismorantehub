import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ from: vi.fn(), select: vi.fn(), order: vi.fn() }));

vi.mock('../../../services/supabaseClient', () => ({
  supabase: { from: mocks.from },
}));

import { fetchMobileProductTypes } from './mobileProductTypeService';

describe('fetchMobileProductTypes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.from.mockReturnValue({ select: mocks.select });
    mocks.select.mockReturnValue({ order: mocks.order });
  });

  it('carrega somente o identificador e o nome, em ordem alfabética', async () => {
    const rows = [{ id: 'type-1', name: 'Mesa' }];
    mocks.order.mockResolvedValue({ data: rows, error: null });

    await expect(fetchMobileProductTypes()).resolves.toEqual(rows);

    expect(mocks.from).toHaveBeenCalledWith('product_types');
    expect(mocks.select).toHaveBeenCalledWith('id,name');
    expect(mocks.order).toHaveBeenCalledWith('name');
  });
});
