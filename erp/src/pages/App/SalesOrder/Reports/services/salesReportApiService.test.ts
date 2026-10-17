import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ query: vi.fn(), canonical: vi.fn() }));
vi.mock('@/pages/utils/supabaseConfig', () => ({ supabase: { from: (table: string) => {
  const chain: any = { select: () => chain, eq: () => chain, neq: () => chain, is: () => chain, not: () => chain, or: () => chain,
    then: (yes: any, no: any) => Promise.resolve(mocks.query(table)).then(yes, no) }; return chain;
} } }));
vi.mock('@/pages/utils/variationCanonicalService', () => ({ resolveCanonicalVariationReportItems: mocks.canonical }));
import { fetchFromERP } from './salesReportApiService';
beforeEach(() => { vi.resetAllMocks(); mocks.canonical.mockImplementation(async items => items); });
afterEach(() => { vi.useRealTimers(); });
const canonicalRow = { description: 'Mesa', quantity: 2, unit_price: 10, cost_price: 3, variation_id: 'variation', item_snapshot: { mainSupplierName: 'Fornecedor' }, orders: { created_at: '2026-01-02T12:00:00Z' } };
describe('report ERP fetch lifetime', () => {
  it('preserves canonical item costs, dates and quantities', async () => {
    mocks.query.mockResolvedValue({ data: [canonicalRow], error: null }); expect(await fetchFromERP()).toEqual([expect.objectContaining({ product: 'Mesa', supplier: 'Fornecedor', quantity: 2, cost: 3, salesValue: 20, profit: 14 })]); expect(mocks.query).toHaveBeenCalledOnce();
  });
  it('preserves the legacy fallback after a known unavailable canonical query', async () => {
    mocks.query.mockResolvedValueOnce({ data: null, error: { code: '42P01' } }).mockResolvedValueOnce({ data: [{ order_data: { date: '02/01/2026', items: [{ description: 'Mesa', quantity: 2, unitCost: 3, unitPrice: 10 }] } }], error: null });
    expect(await fetchFromERP()).toEqual([expect.objectContaining({ quantity: 2, cost: 3, salesValue: 20, profit: 14 })]); expect(mocks.query.mock.calls.map(([table]) => table)).toEqual(['order_items', 'orders']);
  });
  it('does not start a fallback query after the canonical request times out', async () => {
    vi.useFakeTimers(); mocks.query.mockReturnValue(new Promise(() => {})); const request = fetchFromERP(); const rejected = expect(request).rejects.toThrow(/prazo/);
    await vi.advanceTimersByTimeAsync(15_001); await rejected; expect(mocks.query).toHaveBeenCalledOnce();
  });
  it('checks current context before resolving variations or requesting fallback data', async () => {
    let current = true; mocks.query.mockImplementation(async () => { current = false; return { data: [canonicalRow], error: null }; });
    await expect(fetchFromERP({ isCurrent: () => current })).rejects.toThrow(/contexto/); expect(mocks.canonical).not.toHaveBeenCalled(); expect(mocks.query).toHaveBeenCalledOnce();
  });
  it('bounds variation resolution without starting legacy fallback', async () => {
    vi.useFakeTimers(); mocks.query.mockResolvedValue({ data: [canonicalRow], error: null }); mocks.canonical.mockReturnValue(new Promise(() => {}));
    const request = fetchFromERP(); const rejected = expect(request).rejects.toThrow(/prazo/); await vi.advanceTimersByTimeAsync(15_001); await rejected; expect(mocks.query).toHaveBeenCalledOnce();
  });
});
