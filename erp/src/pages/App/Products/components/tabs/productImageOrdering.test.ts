import { describe, expect, it } from 'vitest';
import { moveProductImage, replaceProductImage, setProductCoverImage } from './productImageOrdering';

describe('productImageOrdering', () => {
    const images = ['a.jpg', 'b.jpg', 'c.jpg'];

    it('reordena sem mutar a lista original', () => {
        expect(moveProductImage(images, 0, 2)).toEqual(['b.jpg', 'c.jpg', 'a.jpg']);
        expect(images).toEqual(['a.jpg', 'b.jpg', 'c.jpg']);
    });

    it('promove uma imagem a capa', () => {
        expect(setProductCoverImage(images, 2)).toEqual(['c.jpg', 'a.jpg', 'b.jpg']);
        expect(setProductCoverImage(images, 0)).toBe(images);
    });

    it('substitui apenas um índice existente', () => {
        expect(replaceProductImage(images, 1, 'nova.jpg')).toEqual(['a.jpg', 'nova.jpg', 'c.jpg']);
        expect(replaceProductImage(images, 3, 'nova.jpg')).toBe(images);
    });
});
