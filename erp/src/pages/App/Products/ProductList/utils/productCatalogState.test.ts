import { describe, expect, it } from 'vitest';
import { updateProductCatalogState } from './productCatalogState';

const products: any[] = [{
    id: 'parent',
    sku: 'PARENT',
    status: 'hidden',
    variations: [
        { id: 'variation-a', sku: 'RED', status: 'hidden' },
        { id: 'variation-b', sku: 'BLUE', status: 'hidden' },
    ],
}];

describe('updateProductCatalogState', () => {
    it('atualiza somente a variação apontada pelo UUID', () => {
        const updated = updateProductCatalogState(products, 'variation-b', 'published');
        expect(updated[0].variations[0].status).toBe('hidden');
        expect(updated[0].variations[1].status).toBe('published');
        expect(updated[0].status).toBe('hidden');
    });

    it('sincroniza o status do pai quando ele possui uma única variação', () => {
        const singleVariationParent: any[] = [{
            id: 'single-parent',
            status: 'hidden',
            variations: [{ id: 'single-variation', sku: '000001-01', status: 'hidden' }],
        }];

        const updated = updateProductCatalogState(singleVariationParent, 'single-variation', 'published');

        expect(updated[0].status).toBe('published');
        expect(updated[0].variations[0].status).toBe('published');
    });

    it('atualiza o produto e suas variações quando o ID é do pai', () => {
        const updated = updateProductCatalogState(products, 'parent', 'published');
        expect(updated[0].status).toBe('published');
        expect(updated[0].variations.every((variation: any) => variation.status === 'published')).toBe(true);
    });
});
