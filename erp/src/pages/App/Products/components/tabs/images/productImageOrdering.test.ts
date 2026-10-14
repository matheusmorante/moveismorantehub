import { describe, expect, it } from 'vitest';
import {
  moveProductImage,
  replaceProductImage,
  setProductCoverImage,
  setProductSecondaryImage,
} from './productImageOrdering';

describe('productImageOrdering', () => {
  const images = ['a.jpg', 'b.jpg', 'c.jpg', 'd.jpg'];

  it('reordena sem mutar a lista original', () => {
    expect(moveProductImage(images, 0, 2)).toEqual(['b.jpg', 'c.jpg', 'a.jpg', 'd.jpg']);
    expect(images).toEqual(['a.jpg', 'b.jpg', 'c.jpg', 'd.jpg']);
  });

  it('promove uma imagem a capa', () => {
    expect(setProductCoverImage(images, 2)).toEqual(['c.jpg', 'a.jpg', 'b.jpg', 'd.jpg']);
    expect(setProductCoverImage(images, 0)).toBe(images);
  });

  it('promove uma imagem a secundária (posição 1)', () => {
    expect(setProductSecondaryImage(images, 3)).toEqual(['a.jpg', 'd.jpg', 'b.jpg', 'c.jpg']);
    expect(setProductSecondaryImage(images, 1)).toBe(images);
    expect(setProductSecondaryImage(images, 0)).toBe(images);
  });

  it('substitui apenas um índice existente', () => {
    expect(replaceProductImage(images, 1, 'nova.jpg')).toEqual(['a.jpg', 'nova.jpg', 'c.jpg', 'd.jpg']);
    expect(replaceProductImage(images, 4, 'nova.jpg')).toBe(images);
  });
});
