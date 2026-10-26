import { afterEach, describe, expect, it, vi } from 'vitest';

const { supabaseMock } = vi.hoisted(() => ({
  supabaseMock: { from: vi.fn() },
}));

vi.mock('@/pages/utils/supabaseConfig', () => ({ supabase: supabaseMock }));

import { fetchProductCategoryOptions } from './productCategoryOptionsService';

afterEach(() => vi.clearAllMocks());

describe('fetchProductCategoryOptions', () => {
  it('omite ambientes e mantém categorias legadas sem tipo', async () => {
    const order = vi.fn().mockResolvedValue({
      data: [
        { id: 'category', name: 'Cozinha', type: 'category' },
        { id: 'environment', name: 'Casa', type: 'environment' },
        { id: 'legacy', name: 'Legada' },
        { id: 'null-type', name: 'Tipo nulo', type: null },
      ],
      error: null,
    });
    const select = vi.fn().mockReturnValue({ order });
    supabaseMock.from.mockReturnValue({ select });

    await expect(fetchProductCategoryOptions()).resolves.toEqual([
      { id: 'category', name: 'Cozinha' },
      { id: 'legacy', name: 'Legada' },
      { id: 'null-type', name: 'Tipo nulo' },
    ]);
    expect(supabaseMock.from).toHaveBeenCalledWith('categories');
    expect(select).toHaveBeenCalledWith('id, name, type');
    expect(order).toHaveBeenCalledWith('name');
  });
});
