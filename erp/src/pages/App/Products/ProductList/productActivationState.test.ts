import { describe, expect, it } from 'vitest';
import { updateProductActivationState } from './productActivationState';

const products: any[] = [
    {
        id: 'parent',
        active: false,
        variations: [
            { id: 'variation-a', sku: 'RED', active: false },
            { id: 'variation-b', sku: 'BLUE', active: false },
        ],
    },
    { id: 'child', parentId: 'parent', active: false },
];

describe('updateProductActivationState', () => {
    it('atualiza produto-pai, variações e filhos independentes', () => {
        const updated = updateProductActivationState(products, 'parent', true);
        expect(updated[0].active).toBe(true);
        expect(updated[0].variations).toEqual([
            { id: 'variation-a', sku: 'RED', active: true },
            { id: 'variation-b', sku: 'BLUE', active: true },
        ]);
        expect(updated[1].active).toBe(true);
    });

    it('atualiza somente a variação identificada pelo SKU composto', () => {
        const updated = updateProductActivationState(products, 'parent_BLUE', true);
        expect(updated[0].variations[0].active).toBe(false);
        expect(updated[0].variations[1].active).toBe(true);
    });
});
