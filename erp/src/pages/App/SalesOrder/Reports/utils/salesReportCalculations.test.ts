import { describe, expect, it } from 'vitest';
import { calculateABC } from './salesReportCalculations';
const items = [{ date: new Date('2026-01-02T12:00:00Z'), product: 'Mesa', supplier: 'Fornecedor', quantity: 2, cost: 3, salesValue: 20, profit: 14 }];
describe('sales report preparation', () => {
  it('returns the complete analysis when a caller prepares a snapshot without applying it to the view', () => {
    const result = calculateABC(items, 'revenue', true);
    expect(result.results).toHaveLength(1); expect(result.allProducts).toHaveLength(1);
    expect(result.results[0]).toMatchObject({ product: 'Mesa', totalRevenue: 20, totalProfit: 14 });
  });
  it('keeps the same calculations for preview and view consumers', () => {
    expect(calculateABC(items, 'revenue', true)).toEqual(calculateABC(items, 'revenue', false));
  });
  it('keeps excluded items in the full source aggregate for later re-inclusion', () => {
    const result = calculateABC([...items, { ...items[0], product: 'Armário' }], 'revenue', true, { excludedItems: ['Mesa'] });
    expect(result.results.map(row => row.product)).toEqual(['Armário']); expect(result.allProducts).toHaveLength(2);
  });
  it('preserves empty and negative-profit analyses', () => {
    expect(calculateABC([], 'revenue', true).results).toEqual([]);
    expect(calculateABC([{ ...items[0], profit: -4 }], 'revenue', true).totalProfit).toBe(-4);
  });
  it('preserves the source aggregate after excluding every product', () => {
    const result = calculateABC(items, 'revenue', true, { excludedItems: ['Mesa'] });
    expect(result.results).toEqual([]); expect(result.allProducts[0]).toMatchObject({ product: 'Mesa', qty: 2, rev: 20, profit: 14 });
  });
});
