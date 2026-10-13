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
    images: Array.from(
      { length: imageCount },
      (_, imageIndex) => `variation-${variationIndex}-${imageIndex}`
    ),
  })) as Product['variations'],
});

describe('productImageHelpers', () => {
  it.each([
    [0, 75],
    [1, 75],
    [2, 75],
    [3, 75],
    [6, 75],
  ])(
    'maintains a fixed parent gallery limit of %i images regardless of %i variation(s)',
    (variationCount, expected) => {
      expect(getMaxParentProductImages(variationCount)).toBe(expected);
    }
  );

  it('rejects new parent images above the fixed 75 image limit', () => {
    expect(() => validateProductImageLimits(productWithImages(76, [0, 0]))).toThrow('75 fotos');
  });

  it('allows up to 75 images with only 1 variation or no variations', () => {
    expect(() => validateProductImageLimits(productWithImages(75, [0]))).not.toThrow();
  });

  it('keeps the 15 image limit for each variation', () => {
    expect(() => validateProductImageLimits(productWithImages(15, [16]))).toThrow(
      'Cada variação pode vincular no máximo 15 fotos.'
    );
  });

  it('preserves legacy parent images above 75 while preventing additional images', () => {
    const existingProduct = productWithImages(80, [0]);

    expect(() => validateProductImageLimits(existingProduct, existingProduct)).not.toThrow();
    expect(() => validateProductImageLimits(productWithImages(81, [0]), existingProduct)).toThrow(
      '75 fotos'
    );
    expect(() =>
      validateProductImageLimits(productWithImages(75, [0]), existingProduct)
    ).not.toThrow();
  });
});
