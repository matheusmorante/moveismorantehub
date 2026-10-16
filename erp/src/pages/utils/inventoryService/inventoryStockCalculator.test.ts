import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ from: vi.fn(), update: vi.fn(), map: vi.fn(), response: {} as any }));
vi.mock('@/pages/utils/supabaseConfig', () => ({ supabase: { from: mocks.from } }));
vi.mock('@/pages/utils/productService', () => ({ mapFromDB: mocks.map, updateProduct: mocks.update }));
import { recalculateProductStockOnMove } from './inventoryStockCalculator';
const move = { productId: 'product-1', productDescription: 'Product', type: 'entry' as const, quantity: 2, date: '2026-10-15T12:00:00Z' };
beforeEach(() => {
  vi.resetAllMocks(); mocks.response = { data: { id: 'product-1', stock: 3, costPrice: 0 }, error: null };
  mocks.map.mockImplementation((data) => data);
  mocks.from.mockImplementation(() => { const query: any = { select: vi.fn(() => query), eq: vi.fn(() => query), single: vi.fn(async () => mocks.response) }; return query; });
});
describe('real fallback stock calculator', () => {
  it('does not silently confirm a failed or missing product query', async () => {
    mocks.response = { data: null, error: { code: '42501' } };
    await expect(recalculateProductStockOnMove(move)).rejects.toEqual({ code: '42501' });
    mocks.response = { data: null, error: null };
    await expect(recalculateProductStockOnMove(move)).rejects.toThrow('Produto não encontrado');
    expect(mocks.update).not.toHaveBeenCalled();
  });
  it('does not update the parent when the requested variation is absent', async () => {
    for (const variations of [[], [{ id: 'different', stock: 5 }]]) {
      mocks.response.data.variations = variations;
      await expect(recalculateProductStockOnMove({ ...move, variationId: 'variation-1' })).rejects.toThrow('Variação não encontrada');
    }
    expect(mocks.update).not.toHaveBeenCalled();
  });
  it('preserves the existing stock increment and zero cost when no variation was requested', async () => {
    await recalculateProductStockOnMove(move);
    expect(mocks.update).toHaveBeenCalledWith('product-1', { stock: 5, costPrice: 0, variations: undefined });
  });
});
