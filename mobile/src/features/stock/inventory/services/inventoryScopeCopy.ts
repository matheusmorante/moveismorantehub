import type { SearchableProduct } from '../modals/InventoryProductSearchModal';

export interface InventoryScopeCopySource {
  productId?: unknown;
  variationId?: unknown;
}

export type InventoryScopeCopyResolution =
  | { valid: true; products: SearchableProduct[] }
  | { valid: false; message: string };

const unavailableMessage =
  'A cópia contém itens indisponíveis ou não possui itens. Confira o catálogo antes de iniciar.';

export const resolveInventoryScopeCopy = (
  copiedItems: readonly InventoryScopeCopySource[] | null | undefined,
  currentProducts: readonly SearchableProduct[]
): InventoryScopeCopyResolution => {
  if (!copiedItems?.length) return { valid: false, message: unavailableMessage };

  const productsById = new Map<string, SearchableProduct[]>();
  for (const product of currentProducts) {
    const productId = String(product.id || '').trim();
    if (!productId) continue;
    productsById.set(productId, [...(productsById.get(productId) || []), product]);
  }

  const seenSources = new Set<string>();
  const seenResolvedItems = new Set<string>();
  const resolved: SearchableProduct[] = [];

  for (const source of copiedItems) {
    const productId = String(source.productId ?? '').trim();
    const variationId = String(source.variationId ?? '').trim();
    if (!productId) return { valid: false, message: unavailableMessage };

    const sourceKey = JSON.stringify([productId, variationId]);
    if (seenSources.has(sourceKey)) return { valid: false, message: unavailableMessage };
    seenSources.add(sourceKey);

    const currentRows = productsById.get(productId) || [];
    if (!currentRows.length) return { valid: false, message: unavailableMessage };

    let selectedRows: SearchableProduct[];
    if (variationId) {
      const variation = currentRows.find((row) => String(row.variation_id || '') === variationId);
      if (!variation) return { valid: false, message: unavailableMessage };
      selectedRows = [variation];
    } else {
      const variations = currentRows.filter((row) => Boolean(row.variation_id));
      selectedRows = variations.length ? variations : currentRows.filter((row) => !row.variation_id);
      if (!selectedRows.length) return { valid: false, message: unavailableMessage };
    }

    for (const row of selectedRows) {
      const resolvedKey = JSON.stringify([String(row.id), String(row.variation_id || '')]);
      if (seenResolvedItems.has(resolvedKey))
        return { valid: false, message: unavailableMessage };
      seenResolvedItems.add(resolvedKey);
      resolved.push(row);
    }
  }

  return resolved.length
    ? { valid: true, products: resolved }
    : { valid: false, message: unavailableMessage };
};
