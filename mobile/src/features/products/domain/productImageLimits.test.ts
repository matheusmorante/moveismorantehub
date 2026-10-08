import { describe, expect, it } from 'vitest';
import { getMaxParentProductImages, MAX_VARIATION_IMAGES } from './productImageLimits';

describe('limites de fotos de produtos', () => {
  it('mantém 15 fotos no produto pai sem variações ou com uma variação', () => {
    expect(getMaxParentProductImages()).toBe(15);
    expect(getMaxParentProductImages(0)).toBe(15);
    expect(getMaxParentProductImages(1)).toBe(15);
  });

  it('acrescenta 15 espaços para cada variação adicional', () => {
    expect(getMaxParentProductImages(2)).toBe(30);
    expect(getMaxParentProductImages(5)).toBe(75);
    expect(MAX_VARIATION_IMAGES).toBe(15);
  });
});
