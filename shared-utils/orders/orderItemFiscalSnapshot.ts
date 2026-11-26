export const ORDER_ITEM_FISCAL_SNAPSHOT_VERSION = 1 as const;

type FiscalRecord = Record<string, unknown>;

export type FiscalSnapshotItem = {
  itemType?: string;
  fiscal?: unknown;
  fiscalSnapshotVersion?: number;
  fiscalSnapshotProductId?: string;
  fiscalSnapshotVariationId?: string;
  productId?: string;
  variationId?: string;
};

type FiscalSnapshotSource = {
  id?: unknown;
  unit?: unknown;
  fiscal?: unknown;
};

const record = (value: unknown): FiscalRecord =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? (value as FiscalRecord)
    : {};

const nonEmptyString = (value: unknown): string | undefined =>
  typeof value === 'string' && value.trim() ? value.trim() : undefined;

/**
 * A complete snapshot has an explicit version and normalized commercial and
 * taxable units. Older code persisted isolated fields such as NCM on order
 * items; those rows need a controlled catalog fallback that fills missing
 * facts while preserving values already recorded on the item.
 */
export function hasFiscalItemSnapshot(item: unknown): boolean {
  const itemRecord = record(item);
  const version = itemRecord.fiscalSnapshotVersion;
  const fiscal = record(itemRecord.fiscal);
  return (
    typeof version === 'number' &&
    Number.isInteger(version) &&
    version > 0 &&
    Boolean(nonEmptyString(fiscal.commercialUnit)) &&
    Boolean(nonEmptyString(fiscal.taxableUnit))
  );
}

export function versionExistingFiscalItemSnapshot<T extends object>(item: T): T {
  return {
    ...record(item),
    fiscalSnapshotVersion: ORDER_ITEM_FISCAL_SNAPSHOT_VERSION,
  } as T;
}

/**
 * Capture product facts on an order item. Product-level fiscal settings are
 * copied first and variation settings override them. Operation-dependent
 * CFOP/CSOSN decisions are still validated against the order context at issue.
 */
export function createFiscalItemSnapshot<T extends object>(
  item: T,
  product: FiscalSnapshotSource,
  variation?: FiscalSnapshotSource,
  options: { preserveExisting?: boolean } = {}
): T & FiscalSnapshotItem {
  const itemRecord = record(item);
  const {
    fiscalSnapshotProductId: _oldProductRef,
    fiscalSnapshotVariationId: _oldVariationRef,
    ...itemWithoutOldSnapshotRefs
  } = itemRecord;
  const productFiscal = record(product.fiscal);
  const variationFiscal = record(variation?.fiscal);
  const existingFiscal = options.preserveExisting === false ? {} : record(itemRecord.fiscal);
  const commercialUnit =
    nonEmptyString(existingFiscal.commercialUnit) ||
    nonEmptyString(existingFiscal.unit) ||
    nonEmptyString(variationFiscal.commercialUnit) ||
    nonEmptyString(productFiscal.commercialUnit) ||
    nonEmptyString(variationFiscal.unit) ||
    nonEmptyString(productFiscal.unit) ||
    nonEmptyString(product.unit) ||
    'UN';
  const taxableUnit =
    nonEmptyString(existingFiscal.taxableUnit) ||
    nonEmptyString(variationFiscal.taxableUnit) ||
    nonEmptyString(productFiscal.taxableUnit) ||
    commercialUnit;
  const productId =
    nonEmptyString(product.id) ||
    nonEmptyString(itemRecord.productId) ||
    (options.preserveExisting === false ? undefined : nonEmptyString(itemRecord.fiscalSnapshotProductId));
  const variationId =
    nonEmptyString(variation?.id) ||
    nonEmptyString(itemRecord.variationId) ||
    (options.preserveExisting === false
      ? undefined
      : nonEmptyString(itemRecord.fiscalSnapshotVariationId));

  return {
    ...itemWithoutOldSnapshotRefs,
    fiscalSnapshotVersion: ORDER_ITEM_FISCAL_SNAPSHOT_VERSION,
    ...(productId ? { fiscalSnapshotProductId: productId } : {}),
    ...(variationId ? { fiscalSnapshotVariationId: variationId } : {}),
    fiscal: {
      ...productFiscal,
      ...variationFiscal,
      ...existingFiscal,
      commercialUnit,
      taxableUnit,
    },
  } as T & FiscalSnapshotItem;
}

export function hasPersistedAuthorizedInvoice(order: unknown): boolean {
  const nfeData = record(record(order).nfeData);
  return (
    typeof nfeData.xml === 'string' &&
    nfeData.xml.length > 0 &&
    (nfeData.status === 'autorizada' || nfeData.status === 'homologada')
  );
}
