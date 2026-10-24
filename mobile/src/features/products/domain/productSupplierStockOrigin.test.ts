import { describe, expect, it } from 'vitest';
import {
  getProductSupplierStockOrigin,
  getSelectedProductStockKind,
  supplierProvidesStockOrigin,
} from '../../../../../shared-utils/productSupplierStockOrigin';

describe('product supplier stock origin', () => {
  it.each([
    ['normal', 'normal'],
    ['salvado', 'salvados'],
    ['usado', 'usados'],
    [undefined, 'normal'],
  ] as const)('maps product kind %s to supplier origin %s', (productKind, expected) => {
    expect(getProductSupplierStockOrigin(productKind)).toBe(expected);
  });

  it.each([
    ['normal', 'normal'],
    ['salvado', 'salvado'],
    ['usado', 'usado'],
    [undefined, undefined],
    ['', undefined],
    ['invalid', undefined],
  ] as const)('returns the ERP selection state for product kind %s', (productKind, expected) => {
    expect(getSelectedProductStockKind(productKind)).toBe(expected);
  });

  it('matches the ERP default for suppliers without configured origins', () => {
    expect(supplierProvidesStockOrigin(undefined, 'normal')).toBe(true);
    expect(supplierProvidesStockOrigin(null, 'normal')).toBe(true);
    expect(supplierProvidesStockOrigin([], 'normal')).toBe(false);
    expect(supplierProvidesStockOrigin(['normal'], 'salvados')).toBe(false);
  });

  it('accepts suppliers configured for the selected origin', () => {
    expect(supplierProvidesStockOrigin(['salvados', 'usados'], 'salvados')).toBe(true);
    expect(supplierProvidesStockOrigin(['salvados', 'usados'], 'usados')).toBe(true);
  });
});
