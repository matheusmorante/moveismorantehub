import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => {
  const builder: Record<string, any> = {};
  return {
    builder,
    select: vi.fn(),
    supabaseFrom: vi.fn(),
    fetchCatalogProducts: vi.fn(),
  };
});

vi.mock('@/pages/utils/supabaseConfig', () => ({
  supabase: { from: mocks.supabaseFrom },
}));
vi.mock('@/pages/utils/whatsappGraphService', () => ({
  whatsappGraphService: { fetchCatalogProducts: mocks.fetchCatalogProducts },
}));

import { fetchPaginatedChannelProducts } from './channelCatalogService';

describe('fetchPaginatedChannelProducts', () => {
  beforeEach(() => {
    Object.assign(mocks.builder, {
      select: mocks.select.mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      or: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      range: vi.fn().mockReturnThis(),
      then: (resolve: (value: unknown) => unknown, reject: (reason: unknown) => unknown) =>
        Promise.resolve({
          data: [
            {
              id: 'parent-1',
              description: 'Produto',
              variations: [
                {
                  id: 'variation-1',
                  name: 'Produto Azul',
                  sku: 'SKU-1',
                  whatsappSync: true,
                  whatsappAutoSync: true,
                  lastWhatsappSync: '2026-10-10T12:00:00.000Z',
                },
              ],
              product_variations: [
                { id: 'variation-1', name: 'Produto Azul', sku: 'SKU-1', stock: 1 },
              ],
            },
          ],
          count: 1,
          error: null,
        }).then(resolve, reject),
    });
    mocks.select.mockReset().mockReturnThis();
    mocks.supabaseFrom.mockReset().mockReturnValue(mocks.builder);
    mocks.fetchCatalogProducts.mockReset().mockResolvedValue([]);
  });

  it('loads saved variation sync settings and omits unsupported variation columns', async () => {
    const result = await fetchPaginatedChannelProducts({
      page: 1,
      itemsPerPage: 30,
      search: '',
      filterChannel: 'all',
      filterCollection: 'all',
    });

    const projection = mocks.select.mock.calls[0][0] as string;
    expect(projection).toContain(', variations, product_variations(');
    expect(projection).toContain('product_variations(id, product_id, name, sku, price, stock, status');
    expect(projection).not.toContain('product_variations(id, product_id, name, sku, price, stock, active');
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].varActive).toBe(true);
    expect(result.rows[0].varWhatsappSync).toBe(true);
    expect(result.rows[0].varWhatsappAutoSync).toBe(true);
    expect(result.rows[0].varLastSync).toBe('2026-10-10T12:00:00.000Z');
  });

  it('includes synced variations in the WhatsApp channel filter', async () => {
    const result = await fetchPaginatedChannelProducts({
      page: 1,
      itemsPerPage: 30,
      search: '',
      filterChannel: 'whatsapp',
      filterCollection: 'all',
    });

    expect(result.rows.map((row) => row.varId)).toEqual(['variation-1']);
  });
});
