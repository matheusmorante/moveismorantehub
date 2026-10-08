type UnknownRecord = Record<string, unknown>;

const asRecord = (value: unknown): UnknownRecord | null =>
  value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as UnknownRecord)
    : null;

const hasExplicitTestIdentifier = (value: unknown): boolean =>
  typeof value === 'string' &&
  (/^\s*(?:TEST_AUT_|NFEHML26P\d*)/i.test(value) ||
    /\[?\s*HML\s*NF\s*TEST\b/i.test(value));

const isHmlFiscalTestProduct = (observations: unknown): boolean =>
  typeof observations === 'string' &&
  ['HMLNFTEST', 'NFE_HML_MATRIX_2026_10'].some((marker) =>
    observations.toUpperCase().includes(marker)
  );

/** Usa os mesmos marcadores do ERP para identificar registros de teste fiscal. */
export const isTestProduct = (value: unknown): boolean => {
  const product = asRecord(value);
  if (!product) return isHmlFiscalTestProduct(value);

  if (
    product.is_test === true ||
    product.is_test === 'true' ||
    product.isTest === true ||
    product.isTest === 'true'
  ) {
    return true;
  }
  if (isHmlFiscalTestProduct(product.observations)) return true;

  if (
    [product.id, product.code, product.sku, product.name, product.title].some(
      hasExplicitTestIdentifier
    )
  ) {
    return true;
  }

  const variations = [
    ...(Array.isArray(product.variations) ? product.variations : []),
    ...(Array.isArray(product.product_variations) ? product.product_variations : []),
  ];

  return variations.some(isTestProduct);
};
