import { describe, expect, it } from 'vitest';
import { groupOfflineInventoryProducts } from './groupOfflineInventoryProducts';

describe('lista operacional do índice offline', () => {
    it('agrupa variações canônicas por produto sem carregar o módulo de Produtos', () => {
        const products = groupOfflineInventoryProducts([
            { id: 'p1', name: 'Mesa', variations: [{ id: 'v1', name: 'Azul' }] },
            { id: 'p1', name: 'Mesa', variations: [{ id: 'v2', name: 'Branca' }] },
            { id: 'p2', name: 'Cadeira', variations: [{ id: 'v3', name: 'Preta' }] },
        ]);

        expect(products).toHaveLength(2);
        expect(products[0].variations?.map(variation => variation.id)).toEqual(['v1', 'v2']);
        expect(products[1].id).toBe('p2');
    });
});
