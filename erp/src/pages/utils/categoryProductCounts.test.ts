import { describe, expect, it } from 'vitest';
import { countDistinctProductsByCategory } from '../../../../shared-utils/categoryProductCounts';

describe('countDistinctProductsByCategory', () => {
  it('deduplica produto entre relação N:N e categoria primária', () => {
    expect(
      countDistinctProductsByCategory([
        { categoryId: 'category-1', productId: 'product-1' },
        { categoryId: 'category-1', productId: 'product-2' },
        { categoryId: 'category-1', productId: 'product-2' },
        { categoryId: 'category-2', productId: 'product-2' },
      ])
    ).toEqual({ 'category-1': 2, 'category-2': 1 });
  });

  it('ignora referências incompletas', () => {
    expect(
      countDistinctProductsByCategory([
        { categoryId: 'category-1' },
        { productId: 'product-1' },
        { categoryId: null, productId: 'product-2' },
        { categoryId: 'category-1', productId: '' },
      ])
    ).toEqual({});
  });
});
