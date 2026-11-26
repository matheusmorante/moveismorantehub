type UnknownRecord = Record<string, unknown>;

export type InboundInvoiceNormalizedItemReference = {
  item_number?: unknown;
  product_id?: string | null;
  variation_id?: string | null;
  raw_item?: unknown;
};

const asRecord = (value: unknown): UnknownRecord =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? (value as UnknownRecord)
    : {};

const readOwnValue = (record: UnknownRecord, keys: string[]) => {
  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(record, key)) {
      return { found: true, value: record[key] };
    }
  }
  return { found: false, value: undefined };
};

const getItemField = (item: unknown, keys: string[]) => {
  const record = asRecord(item);
  const direct = readOwnValue(record, keys);
  if (direct.found) return direct;
  return readOwnValue(asRecord(record.raw_item), keys);
};

const asIdentifier = (value: unknown): string | undefined => {
  if (typeof value !== 'string') return undefined;
  const normalized = value.trim();
  return normalized || undefined;
};

export const isInboundInvoiceVariationUuid = (value: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);

export const collectInboundInvoiceVariationIds = (items: unknown[]) => {
  const ids = new Set<string>();
  for (const item of items) {
    const variation = getItemField(item, [
      'matchedVariationId',
      'matched_variation_id',
      'variation_id',
    ]);
    const variationId = variation.found ? asIdentifier(variation.value) : undefined;
    if (variationId) ids.add(variationId);
  }
  return [...ids];
};

export const reconcileInboundInvoiceVariationReferences = <T extends object>(
  items: T[],
  normalizedItems: InboundInvoiceNormalizedItemReference[],
  validVariationIds: ReadonlySet<string>
): T[] => {
  const normalizedByItem = new Map(
    normalizedItems.map((item, index) => [
      Number(item.item_number) || index + 1,
      item,
    ])
  );
  const validVariationKeys = new Set(
    [...validVariationIds].map((variationId) => variationId.toLowerCase())
  );
  const hasValidVariation = (variationId?: string) =>
    Boolean(variationId && validVariationKeys.has(variationId.toLowerCase()));

  return items.map((item, index) => {
    const currentVariationField = getItemField(item, [
      'matchedVariationId',
      'matched_variation_id',
      'variation_id',
    ]);
    const currentVariationId = currentVariationField.found
      ? asIdentifier(currentVariationField.value)
      : undefined;
    const itemNumberField = getItemField(item, ['itemNumber', 'item_number']);
    const itemNumber = Number(itemNumberField.value) || index + 1;
    const normalized = normalizedByItem.get(itemNumber);

    const variationWasRemoved = Boolean(
      currentVariationId && !hasValidVariation(currentVariationId)
    );
    let matchedVariationId = currentVariationId;
    let matchedProductId = asIdentifier(
      getItemField(item, ['matchedProductId', 'matched_product_id', 'product_id']).value
    );
    let productErpName = getItemField(item, ['productErpName', 'product_erp_name']).value;
    let linkedProductCode = getItemField(item, ['linkedProductCode', 'linked_product_code']).value;
    let sellingPrice = getItemField(item, ['sellingPrice']).value;

    if (variationWasRemoved) {
      const normalizedVariationId = asIdentifier(normalized?.variation_id);
      // The normalized row is protected by the FK and represents the last saved
      // mapping. Never substitute a composition component for this direct link.
      const fallbackVariationId = normalizedVariationId;

      if (fallbackVariationId) {
        matchedVariationId = fallbackVariationId;
        matchedProductId = asIdentifier(normalized?.product_id) || matchedProductId;
        const normalizedSnapshot = asRecord(normalized?.raw_item);
        productErpName =
          normalizedSnapshot.productErpName ??
          normalizedSnapshot.product_erp_name ??
          productErpName;
        linkedProductCode =
          normalizedSnapshot.linkedProductCode ??
          normalizedSnapshot.linked_product_code ??
          linkedProductCode;
      } else {
        matchedVariationId = undefined;
        matchedProductId = undefined;
        productErpName = undefined;
        linkedProductCode = undefined;
        sellingPrice = undefined;
      }
    }

    const next: UnknownRecord = {
      ...item,
      matchedProductId,
      matched_product_id: matchedProductId ?? null,
      matchedVariationId,
      matched_variation_id: matchedVariationId ?? null,
      productErpName,
      linkedProductCode,
      sellingPrice,
    };

    if (Object.prototype.hasOwnProperty.call(item, 'product_id') || variationWasRemoved) {
      next.product_id = matchedProductId ?? null;
    }
    if (Object.prototype.hasOwnProperty.call(item, 'variation_id') || variationWasRemoved) {
      next.variation_id = matchedVariationId ?? null;
    }
    return next as T;
  });
};
