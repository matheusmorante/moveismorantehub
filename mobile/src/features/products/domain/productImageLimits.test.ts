import { describe, expect, it } from 'vitest';
import {
  getMaxParentProductImages,
  MAX_PARENT_PRODUCT_IMAGES,
  MAX_VARIATION_IMAGES,
} from './productImageLimits';

describe('limites de fotos de produtos', () => {
  it('mantém limite fixo de 75 fotos na galeria do produto pai independentemente de variações', () => {
    expect(getMaxParentProductImages()).toBe(75);
    expect(getMaxParentProductImages(0)).toBe(75);
    expect(getMaxParentProductImages(1)).toBe(75);
    expect(getMaxParentProductImages(2)).toBe(75);
    expect(getMaxParentProductImages(5)).toBe(75);
    expect(MAX_PARENT_PRODUCT_IMAGES).toBe(75);
  });

  it('mantém limite de 15 fotos por variação vinculada', () => {
    expect(MAX_VARIATION_IMAGES).toBe(15);
  });
});
