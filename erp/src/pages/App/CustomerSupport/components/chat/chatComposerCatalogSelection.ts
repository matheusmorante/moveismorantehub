import type {
  ProductCatalogPrepareInput,
  ProductCatalogSendSelection,
} from '../../../../../../../shared-utils/productCatalogFormSchemas';

export const toCatalogSendSelection = (
  selection: ProductCatalogPrepareInput
): ProductCatalogSendSelection => ({
  items: selection.items.map(({ productId, variationId }) => ({
    productId,
    ...(variationId ? { variationId } : {}),
  })),
  bulkScope: selection.bulkScope
    ? {
        selectionMode: 'all_matching',
        filters: selection.bulkScope.filters,
        excludedProductIds: selection.bulkScope.excludedProductIds,
      }
    : null,
  hidePrices: selection.hidePrices,
  deliveryMode: selection.deliveryMode,
});
