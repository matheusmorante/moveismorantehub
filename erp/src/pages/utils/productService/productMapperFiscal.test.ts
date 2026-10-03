import { describe, expect, it } from 'vitest';
import { mapFromDB, mapToDB } from './productMapper';

describe('fiscal data from product catalog', () => {
  it('preserves explicit CSOSN, origin and other fiscal fields during mapping', () => {
    const fiscal = {
      cst: '500',
      origem: '2',
      ncm: '94036000',
      cfop: '5405',
      pisCst: '99',
      cofinsCst: '99',
      icmsPercent: 0,
    };
    expect(mapFromDB({ id: 'synthetic', name: 'TEST_AUT', fiscal }).fiscal).toMatchObject(fiscal);
  });
  it('does not fabricate CSOSN or origin when missing from catalog', () => {
    const fiscal = mapFromDB({ id: 'synthetic', name: 'TEST_AUT' }).fiscal;
    expect(fiscal?.cst).toBeUndefined();
    expect(fiscal?.origem).toBeUndefined();
  });

  it('restores the catalog title separately from the internal product name', () => {
    const product = mapFromDB({
      id: 'synthetic',
      name: 'NOME INTERNO',
      marketplace_title: 'Título apresentado no catálogo',
    });

    expect(product.name).toBe('NOME INTERNO');
    expect(product.title).toBe('Título apresentado no catálogo');
    expect(product.marketplaceTitle).toBe('Título apresentado no catálogo');
  });

  it('saves the catalog title separately from the internal product name', () => {
    const mapped = mapToDB({
      name: 'NOME INTERNO',
      marketplaceTitle: 'Título apresentado no catálogo',
    });

    expect(mapped.name).toBe('NOME INTERNO');
    expect(mapped.marketplace_title).toBe('Título apresentado no catálogo');
  });
});
