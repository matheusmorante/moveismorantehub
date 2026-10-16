import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchSuppliersForProduct, fetchSuppliersForProductResult } from './unavailabilitySupplierService';

const { from } = vi.hoisted(() => ({
  from: vi.fn(),
}));

vi.mock('@/pages/utils/supabaseConfig', () => ({
  supabase: { from },
}));
afterEach(() => vi.useRealTimers());

describe('consulta de fornecedores com resultado e prazo', () => {
  beforeEach(() => vi.clearAllMocks());
  it('valida a consulta antes do transporte e distingue erro de ausência', async () => {
    expect((await fetchSuppliersForProductResult('')).error).toBeInstanceOf(Error); expect(from).not.toHaveBeenCalled();
    const query = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data: null, error: new Error('Falha') }) };
    from.mockReturnValue(query);
    expect((await fetchSuppliersForProductResult('product')).error?.message).toBe('Falha');
    query.single.mockResolvedValue({ data: { supplier_ids: [] }, error: null });
    expect(await fetchSuppliersForProductResult('product')).toEqual({ data: [], error: null });
  });
  it.each(['products', 'people'])('limita a espera por %s e descarta a continuação anterior', async (table) => {
    vi.useFakeTimers(); let finish!: (value: unknown) => void;
    const pending = new Promise((resolve) => { finish = resolve; });
    from.mockImplementation((name) => ({ select() { return this; }, eq() { return this; }, in() { return this; },
      single: () => table === 'products' ? pending : Promise.resolve({ data: { supplier_id: 'supplier' }, error: null }),
      or: () => name === 'people' ? pending : Promise.resolve({ data: [], error: null }) }));
    const request = fetchSuppliersForProductResult('product'); await vi.advanceTimersByTimeAsync(10000);
    expect((await request).error?.message).toContain('prazo');
    finish({ data: table === 'products' ? { supplier_id: 'supplier' } : [{ id: 'supplier' }], error: null }); await vi.advanceTimersByTimeAsync(0);
    expect(from).toHaveBeenCalledTimes(table === 'products' ? 1 : 2);
  });
  it('não consulta pessoas depois que o proprietário mudou', async () => {
    let current = true;
    from.mockReturnValue({ select() { return this; }, eq() { return this; }, single: async () => { current = false; return { data: { supplier_id: 'supplier' }, error: null }; } });
    expect((await fetchSuppliersForProductResult('product', () => current)).error).toBeInstanceOf(Error);
    expect(from).toHaveBeenCalledOnce();
  });
});

describe('unavailabilitySupplierService - fetchSuppliersForProduct', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns empty array when productId is empty', async () => {
    const result = await fetchSuppliersForProduct('');
    expect(result).toEqual([]);
    expect(from).not.toHaveBeenCalled();
  });

  it('returns empty array when product has no linked supplier IDs', async () => {
    const mockProductQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { supplier_id: null, main_supplier_id: null, supplier_ids: [] },
        error: null,
      }),
    };
    from.mockReturnValue(mockProductQuery);

    const result = await fetchSuppliersForProduct('prod-1');
    expect(result).toEqual([]);
    expect(from).toHaveBeenCalledWith('products');
    expect(from).not.toHaveBeenCalledWith('people');
  });

  it('deduplicates linked supplier IDs and sorts suppliers by fantasy_name with name fallbacks', async () => {
    const mockProductQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: {
          supplier_id: 'sup-1',
          main_supplier_id: 'sup-2',
          supplier_ids: ['sup-1', 'sup-3', 'sup-4'],
        },
        error: null,
      }),
    };

    const mockPeopleQuery = {
      select: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      or: vi.fn().mockResolvedValue({
        data: [
          {
            id: 'sup-1',
            nickname: 'Beta Móveis',
            full_name: 'Indústria Beta',
            social_name: 'Beta SA',
          },
          { id: 'sup-2', nickname: null, full_name: 'Alfa Estofados', social_name: 'Alfa SA' },
          { id: 'sup-3', nickname: '  ', full_name: '', social_name: 'Gama Colchões' },
          { id: 'sup-4', nickname: null, full_name: null, social_name: null },
        ],
        error: null,
      }),
    };

    from.mockImplementation((table: string) => {
      if (table === 'products') return mockProductQuery;
      if (table === 'people') return mockPeopleQuery;
      return {};
    });

    const result = await fetchSuppliersForProduct('prod-1');

    expect(mockPeopleQuery.in).toHaveBeenCalledWith('id', ['sup-1', 'sup-2', 'sup-3', 'sup-4']);
    expect(result).toEqual([
      { id: 'sup-2', fantasy_name: 'Alfa Estofados' },
      { id: 'sup-1', fantasy_name: 'Beta Móveis' },
      { id: 'sup-4', fantasy_name: 'Fornecedor sem nome' },
      { id: 'sup-3', fantasy_name: 'Gama Colchões' },
    ]);
  });

  it('returns empty array when database query fails', async () => {
    const mockProductQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: null,
        error: new Error('Network error'),
      }),
    };
    from.mockReturnValue(mockProductQuery);

    const result = await fetchSuppliersForProduct('prod-1');
    expect(result).toEqual([]);
  });
});
