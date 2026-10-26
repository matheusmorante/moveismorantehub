import { describe, expect, it } from 'vitest';
import { updateProductFiscalCst } from '../../../../shared-utils/productFiscalCst';

describe('updateProductFiscalCst', () => {
  it('preserves CEST and other fiscal data for codes subject to ST', () => {
    expect(
      updateProductFiscalCst(
        { cst: '103', cest: '2806100', ncm: '94036000', merchandiseOrigin: 'third_party' },
        '201'
      )
    ).toEqual({
      cst: '201',
      cest: '2806100',
      ncm: '94036000',
      merchandiseOrigin: 'third_party',
    });
  });

  it('clears CEST for codes outside the ST set while preserving unrelated fiscal data', () => {
    expect(updateProductFiscalCst({ cst: '201', cest: '2806100', ncm: '94036000' }, '102')).toEqual({
      cst: '102',
      cest: '',
      ncm: '94036000',
    });
  });

  it('starts with an empty CEST when the fiscal draft has not been initialized', () => {
    expect(updateProductFiscalCst(undefined, '103')).toEqual({ cst: '103', cest: '' });
  });

  it('does not discard a legacy JSON key while it stops adding that key to new updates', () => {
    expect(updateProductFiscalCst({ cst: '103', csosn: '103' }, '201')).toEqual({
      cst: '201',
      csosn: '103',
      cest: '',
    });
  });
});
