type RecordValue = Record<string, any>;

const asRecord = (value: unknown): RecordValue =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? (value as RecordValue)
    : {};

/**
 * Resolve the link state in the same order used by Gerenciar vínculos:
 * editable JSON first, normalized rows only when that JSON has no items.
 * This prevents stale fallback snapshots from restoring a removed link.
 */
export const getCurrentInboundInvoiceMappingItems = (invoiceRow: unknown) => {
  const row = asRecord(invoiceRow);
  const editableItems = Array.isArray(row.itens) ? row.itens : [];
  const normalizedItems = Array.isArray(row.inbound_invoice_items)
    ? row.inbound_invoice_items
    : [];
  const usesEditableItems = editableItems.length > 0;
  const sourceItems = usesEditableItems ? editableItems : normalizedItems;

  return sourceItems.map((value: unknown, index: number) => {
    const item = asRecord(value);
    const rawItem = asRecord(item.raw_item);
    const matchedProductId = usesEditableItems
      ? item.matchedProductId || item.matched_product_id || undefined
      : item.product_id || undefined;
    const matchedVariationId = usesEditableItems
      ? item.matchedVariationId || item.matched_variation_id || undefined
      : item.variation_id || undefined;
    const linkMode =
      item.linkMode ?? item.link_mode ?? rawItem.linkMode ?? rawItem.link_mode ?? undefined;
    const compositionLinks =
      item.compositionLinks ??
      item.composition_links ??
      rawItem.compositionLinks ??
      rawItem.composition_links ??
      [];

    return {
      itemNumber: Number(item.itemNumber ?? item.item_number ?? rawItem.itemNumber ?? index + 1),
      matchedProductId,
      matched_product_id: matchedProductId,
      matchedVariationId,
      matched_variation_id: matchedVariationId,
      linkMode,
      link_mode: linkMode,
      compositionLinks,
      composition_links: compositionLinks,
      productErpName: item.productErpName ?? item.product_erp_name ?? rawItem.productErpName,
      linkedProductCode:
        item.linkedProductCode ?? item.linked_product_code ?? rawItem.linkedProductCode,
      sellingPrice: item.sellingPrice ?? rawItem.sellingPrice,
    };
  });
};
