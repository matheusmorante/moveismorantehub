import { describe, expect, it } from 'vitest';
import { createInitialProductFiscalInfo } from './productFiscalDefaults';

describe('createInitialProductFiscalInfo', () => {
    it('usa os padrões oficiais para produto', () => {
        expect(createInitialProductFiscalInfo('product')).toEqual({
            ncm: '', cest: '', cst: '102', cfop: '5102', origem: '0', icmsPercent: 0,
            pisCst: '49', cofinsCst: '49', codigoServico: '',
        });
    });

    it('preserva padrões configurados, exceto CFOP de serviço', () => {
        expect(createInitialProductFiscalInfo('service', { ncm: '94036000', cfop: '5102', cst: '500', origem: '1' }))
            .toMatchObject({ ncm: '94036000', cfop: '5933', cst: '500', origem: '1' });
    });
});
