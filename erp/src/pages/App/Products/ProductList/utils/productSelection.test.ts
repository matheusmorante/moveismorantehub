import { describe, expect, it } from 'vitest';
import { toggleProductSelection } from './productSelection';

const products = [
    { id: 'parent', isParent: true },
    { id: 'variation-a', isVariation: true, parentId: 'parent' },
    { id: 'variation-b', isVariation: true, parentId: 'parent' },
    { id: 'simple' },
];

describe('toggleProductSelection', () => {
    it('seleciona e remove o produto-pai junto das variações', () => {
        expect(toggleProductSelection([], 'parent', products)).toEqual(['parent', 'variation-a', 'variation-b']);
        expect(toggleProductSelection(['parent', 'variation-a', 'variation-b'], 'parent', products)).toEqual([]);
    });

    it('seleciona o pai ao completar a seleção das variações', () => {
        expect(toggleProductSelection(['variation-a'], 'variation-b', products)).toEqual(['variation-a', 'variation-b', 'parent']);
        expect(toggleProductSelection(['parent', 'variation-a', 'variation-b'], 'variation-a', products)).toEqual(['variation-b']);
    });

    it('alterna um produto comum sem afetar os demais', () => {
        expect(toggleProductSelection([], 'simple', products)).toEqual(['simple']);
        expect(toggleProductSelection(['simple'], 'simple', products)).toEqual([]);
    });
});
