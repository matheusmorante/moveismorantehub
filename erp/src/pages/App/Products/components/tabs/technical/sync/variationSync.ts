import { Product } from '@/types/product.type';
import { syncVariationsWithParent } from '@/pages/App/Products/domain/variationParentSync';

/**
 * Sincroniza variações de um produto com os dados herdadíveis do pai, caso haja variações.
 */
export const syncProductWithVariations = (product: Partial<Product>): Partial<Product> => {
  if (!product.variations?.length) {
    return product;
  }

  return {
    ...product,
    variations: syncVariationsWithParent(product.variations, {
      description: product.description,
      width: product.width,
      height: product.height,
      depth: product.depth,
      weight: product.weight,
    }),
  };
};
