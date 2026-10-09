import { beforeEach, describe, expect, it, vi } from 'vitest';

const { supabaseMock } = vi.hoisted(() => ({ supabaseMock: { from: vi.fn() } }));

vi.mock('../../../services/supabaseClient', () => ({ supabase: supabaseMock }));

import { fetchMobileProductsPage } from './mobileProductFetchService';

describe('fetchMobileProductsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('uses a compact projection for agent summaries and keeps virtual variant SKUs', async () => {
    const query: any = {};
    query.select = vi.fn(() => query);
    query.eq = vi.fn(() => query);
    query.order = vi.fn(() => query);
    query.range = vi.fn().mockResolvedValue({
      data: [
        {
          id: 'product-1',
          name: 'Mesa Aurora',
          code: 'MESA-1',
          category: 'Sala',
          unit_price: '1200',
          price: '1200',
          promo_price: null,
          cost_price: '800',
          stock: 3,
          active: true,
          status: 'published',
          item_type: 'product',
          is_draft: false,
          product_categories: [],
          product_variations: [],
        },
      ],
      count: 1,
      error: null,
    });
    supabaseMock.from.mockReturnValue(query);

    const result = await fetchMobileProductsPage(1, 10, { summaryOnly: true });

    const [columns, options] = query.select.mock.calls[0];
    expect(columns).toContain('product_variations(sku, active, merged_to_variation_id)');
    expect(columns).not.toContain('product_images');
    expect(columns).not.toContain('*,');
    expect(options).toEqual({ count: 'exact' });
    expect(result.data[0]).toMatchObject({
      name: 'Mesa Aurora',
      unitPrice: 1200,
      costPrice: 800,
      allVariations: [{ sku: 'MESA-1-01' }],
    });
    expect(result.total).toBe(1);
  });
});
