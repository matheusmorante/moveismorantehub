const inboundProductLinkFields = new Set([
  'matchedProductId',
  'matchedVariationId',
  'productId',
  'variationId',
  'productVariationId',
  'matched_product_id',
  'matched_variation_id',
  'product_variation_id',
  'product_id',
  'variation_id',
  'sellingPrice',
  'apportionedCost',
  'productErpName',
  'product_erp_name',
  'linkedProductCode',
  'linked_product_code',
  'compositionLinks',
  'composition_links',
]);

export const markInboundInvoiceItemsNotApplicable = <T extends object>(
  items: readonly T[]
): Array<T & { linkMode: 'not_applicable' }> =>
  items.map((item) => ({
    ...(Object.fromEntries(
      Object.entries(item).filter(([key]) => !inboundProductLinkFields.has(key))
    ) as T),
    linkMode: 'not_applicable' as const,
  }));
