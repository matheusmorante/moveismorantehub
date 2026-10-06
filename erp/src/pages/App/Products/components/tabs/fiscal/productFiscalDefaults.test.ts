import { describe, expect, it } from 'vitest';
import { createInitialProductFiscalInfo } from './productFiscalDefaults';
import { CSOSN_OPTIONS } from './productFiscalOptions';

describe('createInitialProductFiscalInfo', () => {
  it('usa os padrões oficiais para produto', () => {
    expect(createInitialProductFiscalInfo('product')).toEqual({
      ncm: '',
      cest: '',
      cst: '103',
      cfop: '5102',
      origem: '0',
      icmsPercent: 0,
      pisCst: '99',
      cofinsCst: '99',
      codigoServico: '',
    });
    expect(CSOSN_OPTIONS.some((option) => option.value === '103')).toBe(true);
  });

  it('preserva padrões configurados, exceto CFOP de serviço', () => {
    expect(
      createInitialProductFiscalInfo('service', {
        ncm: '94036000',
        cfop: '5102',
        cst: '500',
        origem: '1',
      })
    ).toMatchObject({ ncm: '94036000', cfop: '5933', cst: '500', origem: '1' });
  });

  it('usa CSOSN 103 como valor inicial de produto, mesmo se outro código vier dos padrões gerais', () => {
    expect(createInitialProductFiscalInfo('product', { cst: '500' }).cst).toBe('103');
  });
});
