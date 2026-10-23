import { beforeEach, describe, expect, it, vi } from 'vitest';

const { state } = vi.hoisted(() => ({
  state: {
    dbData: {} as Record<string, unknown>,
    from: vi.fn(),
    upsert: vi.fn(),
  },
}));

vi.mock('@/pages/utils/supabaseConfig', () => ({ supabase: { from: state.from } }));
vi.mock('./productMapper', () => ({ mapToDB: () => ({ ...state.dbData }) }));
vi.mock('../uniqueSlug', () => ({ resolveUniqueSlug: async () => 'mesa-aurora' }));
vi.mock('../productKindRules', () => ({ isNonConventionalProduct: () => false }));
vi.mock('../productVariationDefaults', () => ({ normalizeVariationSku: (sku: string) => sku }));
vi.mock('./productSkuService', () => ({ TABLE_NAME: 'products', generateUniqueCode: () => 'P-1' }));
vi.mock('./productImageHelpers', () => ({ MAX_VARIATION_IMAGES: 15 }));

import { syncProductToSupabase } from './productPersistenceService';

describe('syncProductToSupabase', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    state.dbData = {
      id: '123e4567-e89b-42d3-a456-426614174000',
      name: 'Mesa Aurora',
      brand: 'Morante',
      category: 'Sala',
      variations: [],
      slug: 'mesa-aurora',
    };
    state.upsert.mockResolvedValue({ error: null });
    state.from.mockReturnValue({ upsert: state.upsert });
  });

  it('preserva a coluna products.brand no payload do produto', async () => {
    await syncProductToSupabase({
      id: '123e4567-e89b-42d3-a456-426614174000',
      name: 'Mesa Aurora',
      brand: 'Morante',
      technicalValues: { Marca: 'Morante' },
      variations: [],
      hasVariations: false,
      isDraft: false,
      itemType: 'product',
    } as any);

    expect(state.from).toHaveBeenCalledWith('products');
    expect(state.upsert).toHaveBeenCalledWith(expect.objectContaining({ brand: 'Morante' }));
  });
});
