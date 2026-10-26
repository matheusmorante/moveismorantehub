import { describe, expect, it } from 'vitest';
import { MAX_VARIATION_IMAGES } from './productImageLimits';
import { resolveMobileVariationImages } from './mobileVariationImages';

describe('resolveMobileVariationImages', () => {
  it('normalizes and caps family galleries while retaining URL order', () => {
    const images = Array.from({ length: MAX_VARIATION_IMAGES + 3 }, (_, index) =>
      `https://images.test/variation-${index + 1}.webp`
    );

    expect(resolveMobileVariationImages(images.join(','), images, true)).toEqual(
      images.slice(0, MAX_VARIATION_IMAGES)
    );
  });

  it('preserves every image for a simple variation inheriting the parent gallery', () => {
    const images = Array.from({ length: MAX_VARIATION_IMAGES + 3 }, (_, index) =>
      `https://images.test/parent-${index + 1}.webp`
    );

    expect(resolveMobileVariationImages(undefined, images, false)).toEqual(images);
  });
});
