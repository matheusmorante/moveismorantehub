import { describe, expect, it } from 'vitest';
import { resolveStockOrigin } from './stockOriginRules';

describe('stockOriginRules - resolveStockOrigin', () => {
  it('retorna Convencional para produto normal', () => {
    expect(resolveStockOrigin({ productKind: 'normal' })).toBe('Convencional');
    expect(resolveStockOrigin({})).toBe('Convencional');
    expect(resolveStockOrigin(null)).toBe('Convencional');
  });

  it('retorna Salvados usando as mesmas chaves canônicas aceitas pelo ERP', () => {
    expect(resolveStockOrigin({ productKind: 'salvado' })).toBe('Salvados');
    expect(resolveStockOrigin({ product_kind: 'salvado' })).toBe('Salvados');
    expect(resolveStockOrigin({ product_kind: 'salvados' })).toBe('Salvados');
    expect(resolveStockOrigin({ condition: 'salvado' })).toBe('Salvados');
    expect(resolveStockOrigin({ is_salvado: true })).toBe('Salvados');
    expect(resolveStockOrigin({ stock_origin: 'salvados' })).toBe('Salvados');
    expect(resolveStockOrigin({ stock_origin: 'usados' })).toBe('Usados');
    expect(resolveStockOrigin({ isSalvado: true } as any)).toBe('Convencional');
  });

  it('retorna Salvados quando a oportunidade contém "salvado"', () => {
    expect(resolveStockOrigin({}, null, 'Queima dos Salvados')).toBe('Salvados');
    expect(resolveStockOrigin({ opportunityName: 'Salvadão' })).toBe('Convencional');
  });

  it('retorna Usados para produto usado por productKind ou oportunidade', () => {
    expect(resolveStockOrigin({ productKind: 'usado' })).toBe('Usados');
    expect(resolveStockOrigin({ product_kind: 'usados' })).toBe('Usados');
    expect(resolveStockOrigin({}, null, 'Produtos Usados')).toBe('Usados');
  });

  it('prioriza variação única se fornecida', () => {
    expect(
      resolveStockOrigin({ productKind: 'normal' }, { productKind: 'salvado' })
    ).toBe('Salvados');
  });
});
