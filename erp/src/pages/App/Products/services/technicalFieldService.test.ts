import { afterEach, describe, expect, it, vi } from 'vitest';

const { supabaseMock } = vi.hoisted(() => ({
  supabaseMock: { from: vi.fn() },
}));

vi.mock('@/pages/utils/supabaseConfig', () => ({ ecommerceSupabase: supabaseMock }));

import {
  fetchTechnicalFieldDefinitions,
  invalidateTechnicalFieldDefinitionsCache,
} from './technicalFieldService';

afterEach(() => {
  invalidateTechnicalFieldDefinitionsCache();
  vi.clearAllMocks();
});

describe('technicalFieldService category requirement verification', () => {
  it('does not reuse an unverified category-link cache for catalog publication', async () => {
    let categoryQueryCount = 0;
    const attributesQuery = {
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({
        data: [{ id: 'finish', name: 'Acabamento', active: true, data_type: 'text', unit: null }],
        error: null,
      }),
    };
    const valuesQuery = {
      select: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue({ data: [], error: null }),
      }),
    };
    const categoryLinksQuery = {
      select: vi.fn().mockReturnValue({
        limit: vi.fn().mockImplementation(async () => {
          categoryQueryCount += 1;
          return categoryQueryCount === 1
            ? { data: null, error: { message: 'offline' } }
            : {
                data: [{ attribute_id: 'finish', category_id: 'cat-1', is_required: true }],
                error: null,
              };
        }),
      }),
    };
    supabaseMock.from.mockImplementation((table: string) => {
      if (table === 'attributes') return attributesQuery;
      if (table === 'attribute_values') return valuesQuery;
      if (table === 'category_attributes') return categoryLinksQuery;
      throw new Error(`Unexpected table ${table}`);
    });

    await fetchTechnicalFieldDefinitions('product-form');
    const verified = await fetchTechnicalFieldDefinitions('product-form', {
      requireCategoryLinks: true,
    });

    expect(categoryQueryCount).toBe(2);
    expect(verified[0].requiredCategoryIds).toEqual(['cat-1']);
  });
});
