import { describe, expect, it } from 'vitest';
import {
  getProductKind,
  isSalvadoStockOrigin,
  resolveStockOrigin,
} from '../../../../../shared-utils/productStockOrigin';

describe('shared productStockOrigin', () => {
  it('normalizes the same fields and aliases accepted by the ERP', () => {
    expect(getProductKind({ productKind: 'salvado' })).toBe('salvado');
    expect(getProductKind({ product_kind: 'salvados' })).toBe('salvado');
    expect(getProductKind({ condition: 'usados' })).toBe('usado');
    expect(getProductKind({ is_salvado: true })).toBe('salvado');
    expect(getProductKind({ stock_origin: 'salvados' })).toBe('salvado');
    expect(getProductKind({ stock_origin: 'usados' })).toBe('usado');
    expect(getProductKind({ stockOrigins: ['salvados'] })).toBe('normal');
    expect(getProductKind({})).toBe('normal');
  });

  it('prioritizes the canonical kind on the single variation', () => {
    expect(resolveStockOrigin({ productKind: 'normal' }, { product_kind: 'usados' })).toBe(
      'Usados'
    );
  });

  it('uses the ERP opportunity fallback without extra mobile normalization', () => {
    expect(resolveStockOrigin({ opportunityName: 'Queima dos Salvados' })).toBe('Salvados');
    expect(resolveStockOrigin({}, null, 'Produtos Usados')).toBe('Usados');
    expect(resolveStockOrigin({ opportunityName: 'Salvadão' })).toBe('Convencional');
  });

  it('shares the ERP badge visibility rule across product, variation and opportunity', () => {
    expect(isSalvadoStockOrigin({ product_kind: 'salvados' })).toBe(true);
    expect(isSalvadoStockOrigin({ stock_origin: 'salvados' })).toBe(true);
    expect(isSalvadoStockOrigin({ productKind: 'normal' }, { productKind: 'salvado' })).toBe(true);
    expect(isSalvadoStockOrigin({ productKind: 'normal' }, null, 'Queima dos Salvados')).toBe(true);
    expect(
      isSalvadoStockOrigin({ productKind: 'normal', opportunityName: 'Semana do Cliente' })
    ).toBe(false);
    expect(isSalvadoStockOrigin({ isSalvado: true } as any)).toBe(false);
  });

  it('uses a resolved opportunity name when the product only carries its ID', () => {
    expect(
      isSalvadoStockOrigin({ opportunityId: 'opportunity-1' }, null, 'Queima dos Salvados')
    ).toBe(true);
  });
});
