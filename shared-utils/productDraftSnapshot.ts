import { omitAbsentCompositionVariationIds } from './productCompositionSerialization';

type UnknownRecord = Record<string, any>;

const asRecord = (value: unknown): UnknownRecord | null =>
  value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as UnknownRecord)
    : null;

/** Shared product lifecycle predicate used by ERP and mobile save paths. */
export const isProductDraft = (product: unknown): boolean => {
  const record = asRecord(product);
  return Boolean(record?.isDraft) || Boolean(record?.is_draft) || record?.status === 'draft';
};

export const removeInitialStockFields = <T extends object>(data: T): T => {
  const result = { ...data } as T & Record<string, unknown>;
  for (const field of ['launchInitialStock', 'initialStock', 'initialCost', 'initialStockEntries']) {
    delete result[field];
  }
  return result;
};

const normalizeCompositionSnapshot = <T extends UnknownRecord>(data: T): T => {
  const result = { ...data } as T & UnknownRecord;
  for (const field of ['comboItems', 'combo_items']) {
    if (Array.isArray(result[field])) {
      result[field] = omitAbsentCompositionVariationIds(result[field]);
    }
  }
  return result;
};

/** Creates the editable draft snapshot shared by the ERP and mobile clients. */
export function createProductDraftSnapshot<T extends UnknownRecord>(product: T): T {
  const snapshot = normalizeCompositionSnapshot(removeInitialStockFields(product)) as T & Record<string, any>;
  delete snapshot.technicalSpecs;
  delete snapshot.technical_specs;
  // Parent discounts are derived from unitPrice/promoPrice and live outside
  // the ERP form data; keep the mobile draft snapshot on the same contract.
  delete snapshot.discountPercent;
  delete snapshot.discountFixed;

  return JSON.parse(JSON.stringify({
    ...snapshot,
    isDraft: true,
    active: false,
    status: 'draft',
    variations: Array.isArray(product.variations)
      ? product.variations.map((variation: UnknownRecord) => ({
          ...normalizeCompositionSnapshot(removeInitialStockFields(variation)),
          active: false,
          status: 'hidden',
        }))
      : undefined,
  })) as T;
}

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
