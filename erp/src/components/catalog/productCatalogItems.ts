import type { CatalogItem } from './productCatalogPresentation';
import type { SupportCatalogProduct, SupportCatalogVariation } from './supportCatalogService';

export const priceOf = (product: SupportCatalogProduct, variation?: SupportCatalogVariation) => {
  const promoPrice = Number(variation?.promoPrice ?? product.promoPrice ?? 0);
  const unitPrice = Number(variation?.price ?? product.price ?? 0);
  return promoPrice > 0 ? promoPrice : unitPrice;
};

export const productImageOf = (product: SupportCatalogProduct, variation?: SupportCatalogVariation) =>
  variation?.imageUrl || product.imageUrl || '';

export const makeCatalogItem = (
  product: SupportCatalogProduct,
  variation?: SupportCatalogVariation,
): CatalogItem | null => {
  if (!product.id || !product.name) return null;
  return {
    productId: product.id,
    ...(variation?.id ? { variationId: variation.id } : {}),
    name: product.title || product.name,
    ...(variation?.name ? { variationName: variation.name } : {}),
    ...(product.slug ? { slug: product.slug } : {}),
    price: priceOf(product, variation),
    ...(productImageOf(product, variation) ? { imageUrl: productImageOf(product, variation) } : {}),
  };
};

export const itemKey = (item: Pick<CatalogItem, 'productId' | 'variationId'>) =>
  `${item.productId}:${item.variationId || ''}`;
