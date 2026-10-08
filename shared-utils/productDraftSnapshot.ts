type UnknownRecord = Record<string, any>;

const asRecord = (value: unknown): UnknownRecord | null =>
  value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as UnknownRecord)
    : null;

const removeInitialStockFields = <T extends object>(data: T): T => {
  const result = { ...data } as T & Record<string, unknown>;
  for (const field of ['launchInitialStock', 'initialStock', 'initialCost', 'initialStockEntries']) {
    delete result[field];
  }
  return result;
};

/** Restores the editable product state while retaining confirmed stock from normalized rows. */
export function restoreProductDraftSnapshot<T extends UnknownRecord>(product: T): T {
  const snapshot = asRecord(asRecord(product.technicalSpecs)?.draftProduct);
  const isDraft = Boolean(product.isDraft) || Boolean(product.is_draft) || product.status === 'draft';
  if (!isDraft || !snapshot || String(snapshot.id) !== product.id) return product;

  const currentVariations = Array.isArray(product.variations) ? product.variations : [];
  const stocks = new Map(currentVariations.map((variation: UnknownRecord) => [variation.id, variation.stock]));
  const variations = Array.isArray(snapshot.variations)
    ? snapshot.variations.map((variation: UnknownRecord) => ({
        ...removeInitialStockFields(variation),
        stock: stocks.get(variation.id) ?? 0,
        active: false,
        status: variation.status || 'draft',
      }))
    : undefined;

  return {
    ...product,
    ...snapshot,
    category: product.category || snapshot.category || '',
    id: product.id,
    updatedAt: product.updatedAt,
    createdAt: product.createdAt,
    technicalSpecs: product.technicalSpecs,
    stock: product.stock,
    isDraft: true,
    active: false,
    // Draft state and catalog publication are independent: keep the persisted
    // channel status (published/hidden) while restoring the editable snapshot.
    status: product.status || snapshot.status || 'draft',
    variations,
  } as T;
}
