import type Product from '@/pages/types/product.type';

export function getProductDraftSnapshotWithoutPendingVariation(
  current: Partial<Product>,
  pendingVariationId: string | null
): Partial<Product> {
  return pendingVariationId
    ? {
        ...current,
        variations: current.variations?.filter(
          (item) => String(item.id) !== String(pendingVariationId)
        ),
      }
    : current;
}
