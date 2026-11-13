import type { CatalogItem } from './productCatalogPresentation';
import type { SupportCatalogProduct, SupportCatalogProductDetails } from './supportCatalogService';
import { makeCatalogItem } from './productCatalogItems';
import type { ProductCatalogPrepareInput } from '../../../../shared-utils/productCatalogFormSchemas';

type BulkScope = NonNullable<ProductCatalogPrepareInput['bulkScope']>;

/**
 * Resolves effective items for catalog delivery, resolving loaded products into concrete
 * CatalogItems even when selected via bulk category scope (e.g. up to 30 products).
 */
export function resolveCatalogEffectiveItems(
  selectedItems: Map<string, CatalogItem>,
  bulkScope: BulkScope | null,
  products: SupportCatalogProduct[],
  productDetailsById: Map<string, SupportCatalogProductDetails>,
): CatalogItem[] {
  if (!bulkScope) {
    return Array.from(selectedItems.values());
  }

  const matchingProducts = products.filter(
    (product) => !bulkScope.excludedProductIds.includes(product.id),
  );

  const items: CatalogItem[] = [];
  for (const product of matchingProducts) {
    if (product.hasVariations) {
      const details = productDetailsById.get(product.id);
      const variation = details?.variations?.[0] || product.variations?.[0];
      const item = makeCatalogItem(product, variation);
      if (item) items.push(item);
    } else {
      const item = makeCatalogItem(product, product.variations?.[0]);
      if (item) items.push(item);
    }
  }

  if (items.length === 0) {
    return Array.from(selectedItems.values());
  }

  return items;
}
