import {
  buildMetaCatalogItems,
  type MetaCatalogItem,
  type MetaCatalogOpportunitySource,
  type MetaCatalogProductSource,
  type MetaCatalogVariationSource,
} from './metaCatalogPayload';

export interface MetaCatalogDeleteItem {
  id: string;
  code: string;
  deleted: true;
  status: 'hidden';
}

export type ProductMetaCatalogSyncItem = MetaCatalogItem | MetaCatalogDeleteItem;

const deletedItem = (id: string, code: string): MetaCatalogDeleteItem => ({
  id,
  code,
  deleted: true,
  status: 'hidden',
});

const getVariationCode = (
  variation: MetaCatalogVariationSource,
  index: number,
  parentCode: string | null | undefined
): string =>
  String(variation.sku || variation.code || '').trim() ||
  (parentCode ? `${parentCode}-${String(index + 1).padStart(2, '0')}` : variation.id);

/** Aplica sem I/O as regras do ERP para sincronizar um produto e suas variações. */
export function buildProductMetaCatalogSyncItems(
  product: MetaCatalogProductSource,
  variations: readonly MetaCatalogVariationSource[],
  opportunities: readonly MetaCatalogOpportunitySource[]
): ProductMetaCatalogSyncItem[] {
  const items: ProductMetaCatalogSyncItem[] = [];
  const isParentEligible =
    product.status === 'published' &&
    !product.deleted_at &&
    !product.deleted &&
    !product.is_draft;

  if (variations.length > 0) {
    // O produto pai da família não é vendido avulso no catálogo.
    items.push(deletedItem(product.id, product.code || product.id));

    if (!isParentEligible) {
      variations.forEach((variation, index) => {
        items.push(deletedItem(variation.id, getVariationCode(variation, index, product.code)));
      });
      return items;
    }

    const built = buildMetaCatalogItems([product], variations, opportunities);
    const itemsByCode = new Map<string, MetaCatalogItem>();
    built.forEach((item) => {
      if (!itemsByCode.has(item.code)) itemsByCode.set(item.code, item);
    });

    variations.forEach((variation, index) => {
      const code = getVariationCode(variation, index, product.code);
      items.push(itemsByCode.get(code) || deletedItem(variation.id, code));
    });
    return items;
  }

  if (!isParentEligible) return [deletedItem(product.id, product.code || product.id)];
  return buildMetaCatalogItems([product], [], opportunities);
}
