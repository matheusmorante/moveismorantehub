import { describe, expect, it } from 'vitest';
import { mapDbVariations } from './productVariationMapper';

describe('mapDbVariations', () => {
    it('normaliza o nome de variações legadas para o mesmo padrão visual', () => {
        const variations = mapDbVariations([
            { id: 'variation-01', product_id: 'product-1', sku: '003962-01', name: 'ARMARIO MULTIUSO ARAMOVEIS NEW 2PT BRANCO', attributes: { Cor: 'BRANCO' } },
            { id: 'variation-02', product_id: 'product-1', sku: '003962-02', name: 'Armario Multiuso Aramoveis New 2pt Off White', attributes: { Cor: 'Off White' } },
        ], { name: 'ARMARIO MULTIUSO ARAMOVEIS NEW 2PT', unit_price: 249, active: true }, '003962');

        expect(variations.map((variation) => variation.name)).toEqual([
            'Armario Multiuso Aramoveis New 2pt Branco',
            'Armario Multiuso Aramoveis New 2pt Off White',
        ]);
        expect(variations[0].attributes).toEqual([{ name: 'Cor', value: 'Branco', showName: true }]);
    });
});
