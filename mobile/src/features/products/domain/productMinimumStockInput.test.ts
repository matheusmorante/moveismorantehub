import { describe, expect, it } from 'vitest';
import { parseProductMinimumStockInput } from '../../../../../shared-utils/productMinimumStockInput';

describe('parseProductMinimumStockInput', () => {
  it('matches the ERP integer conversion for edited values', () => {
    expect(parseProductMinimumStockInput('12')).toBe(12);
    expect(parseProductMinimumStockInput('12.8')).toBe(12);
    expect(parseProductMinimumStockInput('12,8')).toBe(12);
    expect(parseProductMinimumStockInput('')).toBe(0);
    expect(parseProductMinimumStockInput('invalid')).toBe(0);
    expect(parseProductMinimumStockInput('-2')).toBe(-2);
    expect(parseProductMinimumStockInput(12.8)).toBe(12);
    expect(parseProductMinimumStockInput(null)).toBe(0);
  });
});
