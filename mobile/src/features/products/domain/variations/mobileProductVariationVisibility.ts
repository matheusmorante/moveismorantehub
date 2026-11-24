/** Mirrors the ERP rule for hiding obsolete generated default rows once real variations exist. */
export const getMobileProductVariationRecords = (
  product: any,
  includeMerged = false
): any[] => {
  const records = Array.isArray(product?.product_variations) ? product.product_variations : [];
  const hasConfirmedVariation = records.some(
    (variation: any) => !String(variation.sku || '').toUpperCase().startsWith('DEFAULT-')
  );
  const isDraft = Boolean(product?.isDraft || product?.is_draft) || product?.status === 'draft';

  return records.filter((variation: any) => {
    const isGeneratedPlaceholder = String(variation.sku || '')
      .toUpperCase()
      .startsWith('DEFAULT-');
    const isPlaceholderVisible = !isGeneratedPlaceholder || (!isDraft && !hasConfirmedVariation);
    const isMerged = Boolean(variation.merged_to_variation_id || variation.mergedToVariationId);
    return isPlaceholderVisible && (includeMerged || !isMerged);
  });
};
