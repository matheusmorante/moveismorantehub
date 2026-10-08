import { describe, expect, it } from 'vitest';
import type Product from '../../types/product.type';
import { getMaxParentProductImages, validateProductImageLimits } from './productImageHelpers';

const productWithImages = (
  parentImageCount: number,
  variationImageCounts: number[] = []
): Partial<Product> => ({
  images: Array.from({ length: parentImageCount }, (_, index) => `parent-${index}`),
  variations: variationImageCounts.map((imageCount, variationIndex) => ({
    id: `variation-${variationIndex}`,
    images: Array.from({ length: imageCount }, (_, imageIndex) => `variation-${variationIndex}-${imageIndex}`),
  })) as Product['variations'],
});

describe('productImageHelpers', () => {
  it.each([
    [0, 15],
    [1, 15],
    [2, 30],
    [3, 45],
    [6, 90],
  ])('allows %i variation(s) to use a parent limit of %i images', (variationCount, expected) => {
    expect(getMaxParentProductImages(variationCount)).toBe(expected);
  });

  it('rejects new parent images above the limit for the current variation count', () => {
    expect(() => validateProductImageLimits(productWithImages(31, [0, 0]))).toThrow(
      '30 fotos'
    );
  });

  it('does not cap the parent at the former fixed 75 image limit', () => {
    expect(() => validateProductImageLimits(productWithImages(90, [0, 0, 0, 0, 0, 0]))).not.toThrow();
  });

  it('keeps the 15 image limit for each variation', () => {
    expect(() => validateProductImageLimits(productWithImages(15, [16]))).toThrow(
      'Cada variação pode vincular no máximo 15 fotos.'
    );
  });

  it('preserves legacy parent images while preventing additional images above the new limit', () => {
    const existingProduct = productWithImages(30, [0]);

    expect(() => validateProductImageLimits(existingProduct, existingProduct)).not.toThrow();
    expect(() =>
      validateProductImageLimits(productWithImages(31, [0]), existingProduct)
    ).toThrow('15 fotos');
    expect(() =>
      validateProductImageLimits(productWithImages(15, [0]), existingProduct)
    ).not.toThrow();
  });
});
