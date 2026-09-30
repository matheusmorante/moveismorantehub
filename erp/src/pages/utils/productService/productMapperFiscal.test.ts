import { describe, expect, it } from 'vitest';
import { mapFromDB } from './productMapper';

describe('fiscal data from product catalog', () => {
  it('preserves explicit CSOSN, origin and other fiscal fields during mapping', () => {
    const fiscal = { cst: '500', origem: '2', ncm: '94036000', cfop: '5405',
      pisCst: '99', cofinsCst: '99', icmsPercent: 0 };
    expect(mapFromDB({ id: 'synthetic', name: 'TEST_AUT', fiscal }).fiscal).toMatchObject(fiscal);
  });
  it('does not fabricate CSOSN or origin when missing from catalog', () => {
    const fiscal = mapFromDB({ id: 'synthetic', name: 'TEST_AUT' }).fiscal;
    expect(fiscal?.cst).toBeUndefined();
    expect(fiscal?.origem).toBeUndefined();
  });
});
