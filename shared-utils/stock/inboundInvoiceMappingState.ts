type RecordValue = Record<string, any>;

export type GlobalInboundSupplierItemMapping = {
  supplier_id?: string;
  supplier_product_code?: string;
  link_mode: 'single' | 'composition' | 'not_applicable' | 'unlinked';
  product_id?: string | null;
  variation_id?: string | null;
  product_name?: string | null;
  product_sku?: string | null;
  selling_price?: number | string | null;
  components?: Array<Record<string, any>> | null;
  supplier_description?: string | null;
};

const asRecord = (value: unknown): RecordValue =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? (value as RecordValue)
    : {};

export const normalizeInboundSupplierProductCode = (value: unknown) =>
  String(value ?? '').trim().toLocaleUpperCase('pt-BR');

export const getInboundSupplierMappingKey = (supplierId: unknown, productCode: unknown) =>
  `${String(supplierId ?? '').trim()}\u0000${normalizeInboundSupplierProductCode(productCode)}`;

export const getInboundInvoiceSupplierCodes = (invoiceRow: unknown) => {
  const row = asRecord(invoiceRow);
  const supplierId = String(row.supplier_id ?? row.supplierId ?? '').trim();
  if (!supplierId) return [];
  const items = [
    ...(Array.isArray(row.itens) ? row.itens : []),
    ...(Array.isArray(row.inbound_invoice_items) ? row.inbound_invoice_items : []),
    ...(Array.isArray(asRecord(row.raw_extraction).items) ? asRecord(row.raw_extraction).items : []),
    ...(Array.isArray(asRecord(row.raw_extraction).itens) ? asRecord(row.raw_extraction).itens : []),
  ];
  const codes = new Set<string>();
  for (const value of items) {
    const item = asRecord(value);
    const rawItem = asRecord(item.raw_item);
    const code = normalizeInboundSupplierProductCode(
      item.productCode || item.product_code || rawItem.productCode || rawItem.product_code
    );
    if (code) codes.add(code);
  }
  return [...codes].map((supplierProductCode) => ({
    supplier_id: supplierId,
    supplier_product_code: supplierProductCode,
  }));
};

/**
 * Resolve the link state in the same order used by Gerenciar vínculos:
 * editable JSON first, normalized rows only when that JSON has no items.
 * This prevents stale fallback snapshots from restoring a removed link.
 */
export const getCurrentInboundInvoiceMappingItems = (
  invoiceRow: unknown,
  globalMappings?: ReadonlyMap<string, GlobalInboundSupplierItemMapping>
) => {
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
    const productCode = normalizeInboundSupplierProductCode(
      item.productCode || item.product_code || rawItem.productCode || rawItem.product_code
    );
    const supplierId = row.supplier_id ?? row.supplierId;
    const globalMapping = productCode && globalMappings
      ? globalMappings.get(getInboundSupplierMappingKey(supplierId, productCode))
      : undefined;
    const matchedProductId = usesEditableItems
      ? item.matchedProductId || item.matched_product_id || undefined
      : item.product_id || undefined;
    const matchedVariationId = usesEditableItems
      ? item.matchedVariationId || item.matched_variation_id || undefined
      : item.variation_id || undefined;
    const snapshotLinkMode =
      item.linkMode ?? item.link_mode ?? rawItem.linkMode ?? rawItem.link_mode ?? undefined;
    const snapshotCompositionLinks =
      item.compositionLinks ??
      item.composition_links ??
      rawItem.compositionLinks ??
      rawItem.composition_links ??
      [];

    const globalCompositionLinks = (globalMapping?.components || []).map((component, position) => ({
      id: String(component.id ?? `${productCode}:${position + 1}`),
      productId: String(component.productId ?? component.product_id ?? ''),
      variationId: component.variationId ?? component.variation_id ?? undefined,
      productErpName: String(component.productErpName ?? component.product_erp_name ?? ''),
      linkedProductCode: String(component.linkedProductCode ?? component.linked_product_code ?? ''),
      sellingPrice: Number(component.sellingPrice ?? component.selling_price ?? 0),
      apportionedCost: undefined,
      quantityMultiplier: Number(component.quantityMultiplier ?? component.quantity_multiplier ?? 1),
    }));

    let currentProductId = matchedProductId;
    let currentVariationId = matchedVariationId;
    let currentLinkMode = snapshotLinkMode;
    let currentCompositionLinks = snapshotCompositionLinks;
    let productErpName = item.productErpName ?? item.product_erp_name ?? rawItem.productErpName;
    let linkedProductCode = item.linkedProductCode ?? item.linked_product_code ?? rawItem.linkedProductCode;
    let sellingPrice = item.sellingPrice ?? rawItem.sellingPrice;
    let inheritedSupplierLink = item.inheritedSupplierLink ?? rawItem.inheritedSupplierLink;

    if (globalMappings !== undefined) {
      currentProductId = globalMapping?.link_mode === 'single' ? globalMapping.product_id || undefined : undefined;
      currentVariationId = globalMapping?.link_mode === 'single' ? globalMapping.variation_id || undefined : undefined;
      currentLinkMode = globalMapping?.link_mode;
      currentCompositionLinks = globalMapping?.link_mode === 'composition' ? globalCompositionLinks : [];
      productErpName = globalMapping?.link_mode === 'single' ? globalMapping.product_name || undefined : undefined;
      linkedProductCode = globalMapping?.link_mode === 'single' ? globalMapping.product_sku || undefined : undefined;
      sellingPrice = globalMapping?.link_mode === 'single' ? Number(globalMapping.selling_price || 0) : undefined;
      inheritedSupplierLink = globalMapping ? true : undefined;
    }

    return {
      productCode,
      itemNumber: Number(item.itemNumber || item.item_number || rawItem.itemNumber || index + 1),
      matchedProductId: currentProductId,
      matched_product_id: currentProductId,
      matchedVariationId: currentVariationId,
      matched_variation_id: currentVariationId,
      linkMode: currentLinkMode,
      link_mode: currentLinkMode,
      inheritedSupplierLink,
      compositionLinks: currentCompositionLinks,
      composition_links: currentCompositionLinks,
      productErpName,
      linkedProductCode,
      sellingPrice,
    };
  });
};
