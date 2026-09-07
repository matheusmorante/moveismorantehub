import { describe, expect, it } from 'vitest';
import { INITIAL_PRODUCT_FORM_DATA } from './productFormInitialData';

describe('INITIAL_PRODUCT_FORM_DATA', () => {
    it('inicia um produto como rascunho com uma variação e sem estoque lançado', () => {
        expect(INITIAL_PRODUCT_FORM_DATA).toMatchObject({
            itemType: 'product', active: false, status: 'draft', isDraft: true,
            hasVariations: true, variations: [], launchInitialStock: false,
        });
    });

    it('mantém os padrões fiscais mínimos de venda de produto', () => {
        expect(INITIAL_PRODUCT_FORM_DATA.fiscal).toEqual({
            ncm: '', cest: '', ncmDescription: '', cfop: '5102', icmsPercent: 0,
        });
    });
});
