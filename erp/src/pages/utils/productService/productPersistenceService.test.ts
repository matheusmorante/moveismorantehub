import { beforeEach, describe, expect, it, vi } from 'vitest';

const { state } = vi.hoisted(() => ({
  state: {
    dbData: {} as Record<string, unknown>,
    from: vi.fn(),
    upsert: vi.fn(),
    mapToDB: vi.fn(),
  },
}));

vi.mock('@/pages/utils/supabaseConfig', () => ({ supabase: { from: state.from } }));
vi.mock('./productMapper', () => ({ mapToDB: state.mapToDB }));
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
    state.mapToDB.mockImplementation((product: any) => ({
      ...state.dbData,
      ...(product.stock !== undefined ? { stock: product.stock } : {}),
    }));
    state.upsert.mockResolvedValue({ error: null });
    const query: any = {};
    query.select = vi.fn(() => query);
    query.eq = vi.fn(() => query);
    query.in = vi.fn(() => query);
    query.neq = vi.fn(() => query);
    query.upsert = state.upsert;
    query.update = vi.fn(() => query);
    query.then = (resolve: (value: any) => unknown) =>
      Promise.resolve({ data: [], error: null }).then(resolve);
    state.from.mockReturnValue(query);
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

  it('não grava disponibilidade calculada no saldo físico da composição simples', async () => {
    await syncProductToSupabase({
      id: '123e4567-e89b-42d3-a456-426614174000',
      name: 'Kit Aurora',
      itemType: 'composition',
      stock: 5,
      comboItems: [{ productId: 'component-1', quantity: 2 }],
      variations: [],
      isDraft: false,
    } as any);

    expect(state.upsert).toHaveBeenCalledTimes(1);
    expect(state.upsert.mock.calls[0][0]).not.toHaveProperty('stock');
  });

  it('preserva saldo físico existente das variações de composição durante edição', async () => {
    await syncProductToSupabase({
      id: '123e4567-e89b-42d3-a456-426614174000',
      name: 'Kit Aurora',
      itemType: 'composition',
      stock: 5,
      hasVariations: true,
      variations: [{
        id: '223e4567-e89b-42d3-a456-426614174000',
        name: 'Kit Aurora - Azul',
        sku: 'KIT-AURORA-01',
        stock: 5,
        comboItems: [{ productId: 'component-1', quantity: 2 }],
      }, {
        id: '323e4567-e89b-42d3-a456-426614174000',
        name: 'Kit Aurora - Verde',
        sku: 'KIT-AURORA-02',
        stock: 3,
        comboItems: [{ productId: 'component-2', quantity: 1 }],
      }],
      isDraft: false,
      status: 'hidden',
    } as any);

    expect(state.upsert).toHaveBeenCalledTimes(2);
    expect(state.upsert.mock.calls[0][0]).not.toHaveProperty('stock');
    expect(state.upsert.mock.calls[1][0]).toHaveLength(2);
    expect(state.upsert.mock.calls[1][0].every((variation: any) => !('stock' in variation))).toBe(true);
  });

  it('continua gravando estoque físico do produto e das variações simples', async () => {
    await syncProductToSupabase({
      id: '123e4567-e89b-42d3-a456-426614174000',
      name: 'Mesa Aurora',
      itemType: 'product',
      stock: 12,
      hasVariations: false,
      variations: [{
        id: '223e4567-e89b-42d3-a456-426614174000',
        name: 'Mesa Aurora',
        sku: 'MESA-AURORA-01',
        stock: 12,
      }],
      isDraft: false,
      status: 'hidden',
    } as any);

    expect(state.upsert.mock.calls[0][0]).toHaveProperty('stock', 12);
    expect(state.upsert.mock.calls[1][0][0]).toHaveProperty('stock', 12);
  });
});
