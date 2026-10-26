import { describe, expect, it } from 'vitest';
import { normalizeProductSupplierIds } from '../../../../../shared-utils/productSupplierIds';

describe('normalizeProductSupplierIds', () => {
  it('removes empty and duplicate IDs while preserving first-selection order', () => {
    expect(
      normalizeProductSupplierIds(['supplier-2', '', 'supplier-1', 'supplier-2', null])
    ).toEqual(['supplier-2', 'supplier-1']);
  });

  it('falls back to the main supplier and then the legacy supplier ID', () => {
    expect(normalizeProductSupplierIds([], 'main', 'legacy')).toEqual(['main']);
    expect(normalizeProductSupplierIds(undefined, undefined, 'legacy')).toEqual(['legacy']);
    expect(normalizeProductSupplierIds()).toEqual([]);
  });

  it('uses a non-empty supplier list as the source even if every entry is empty', () => {
    expect(normalizeProductSupplierIds([null, ''], 'main', 'legacy')).toEqual([]);
  });
});
