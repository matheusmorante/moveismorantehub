import type { CatalogItem } from './productCatalogPresentation';
import type { SupportCatalogProduct, SupportCatalogVariation } from './supportCatalogService';
import { parseVariationImages } from '../../../../shared-utils/productVariationImages';

export const priceOf = (product: SupportCatalogProduct, variation?: SupportCatalogVariation) => {
  const promoPrice = Number(variation?.promoPrice ?? product.promoPrice ?? 0);
  const unitPrice = Number(variation?.price ?? product.price ?? 0);
  return promoPrice > 0 ? promoPrice : unitPrice;
};

export const productImageOf = (product: SupportCatalogProduct, variation?: SupportCatalogVariation) =>
  parseVariationImages(variation?.imageUrl)[0] || product.imageUrl || '';

export const makeCatalogItem = (
  product: SupportCatalogProduct,
  variation?: SupportCatalogVariation,
): CatalogItem | null => {
  if (!product.id || !product.name) return null;
  const variationName = variation?.name?.trim()
    || (Array.isArray(variation?.attributes)
      ? variation.attributes.map((attribute: any) => String(attribute?.value || '')).filter(Boolean).join(' / ')
      : '')
    || (variation?.sku ? `SKU ${variation.sku}` : '');
  return {
    productId: product.id,
    ...(variation?.id ? { variationId: variation.id } : {}),
    name: product.title || product.name,
    ...(variationName ? { variationName } : {}),
    ...(product.slug ? { slug: product.slug } : {}),
    price: priceOf(product, variation),
    ...(productImageOf(product, variation) ? { imageUrl: productImageOf(product, variation) } : {}),
  };
};

export const itemKey = (item: Pick<CatalogItem, 'productId' | 'variationId'>) =>
  `${item.productId}:${item.variationId || ''}`;
