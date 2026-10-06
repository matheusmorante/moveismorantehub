export const HML_FISCAL_TEST_ORDER_MARKER = 'NFE_HML_MATRIX_2026_10';
export const HML_FISCAL_TEST_PRODUCT_MARKER = 'HMLNFTEST';
export const TEST_PRODUCT_CATALOG_PUBLICATION_ERROR =
  'Produtos identificados como teste não podem ser publicados no Catálogo Digital.';

type UnknownRecord = Record<string, unknown>;

const asRecord = (value: unknown): UnknownRecord | null =>
  value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as UnknownRecord)
    : null;

const hasExplicitTestIdentifier = (value: unknown): boolean =>
  typeof value === 'string' &&
  (/^\s*(?:TEST_AUT_|NFEHML26P\d*)/i.test(value) ||
    /\[?\s*HML\s*NF\s*TEST\b/i.test(value));

export const isTestOrder = (value: unknown): boolean => {
  const row = asRecord(value);
  if (!row) return false;

  const orderData = asRecord(row.order_data) ?? asRecord(row.orderData) ?? row;
  const isTest = orderData.is_test ?? orderData.isTest ?? row.is_test ?? row.isTest;
  if (isTest === true || isTest === 'true') return true;

  const customerData =
    asRecord(orderData.customerData) ?? asRecord(orderData.customer_data) ?? {};
  return [
    row.order_number,
    row.orderNumber,
    row.customer_name,
    row.notes,
    row.observation,
    orderData.orderNumber,
    orderData.customerName,
    orderData.notes,
    orderData.observation,
    customerData.fullName,
    customerData.name,
  ].some(hasExplicitTestIdentifier);
};

export const isHmlFiscalTestOrder = (value: unknown): boolean => {
  const row = asRecord(value);
  if (!row) return false;

  const orderData = asRecord(row.order_data) ?? asRecord(row.orderData) ?? row;
  const isTest = orderData.is_test ?? orderData.isTest;
  const environment = orderData.test_environment ?? orderData.testEnvironment;
  const testRunId = orderData.testRunId ?? orderData.test_run_id;

  if (
    (isTest === true || isTest === 'true') &&
    environment === 'homologation' &&
    typeof testRunId === 'string' &&
    testRunId.length > 0
  ) {
    return true;
  }

  return (
    isTestOrder(value) ||
    [row.notes, row.observation, orderData.notes, orderData.observation].some(
      (text) => typeof text === 'string' && text.includes(HML_FISCAL_TEST_ORDER_MARKER)
    )
  );
};

export const isHmlFiscalTestProduct = (observations: unknown): boolean =>
  typeof observations === 'string' &&
  [HML_FISCAL_TEST_PRODUCT_MARKER, HML_FISCAL_TEST_ORDER_MARKER].some((marker) =>
    observations.toUpperCase().includes(marker.toUpperCase())
  );

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

  if ([product.code, product.sku, product.name, product.title].some(hasExplicitTestIdentifier)) {
    return true;
  }

  const variations = [
    ...(Array.isArray(product.variations) ? product.variations : []),
    ...(Array.isArray(product.product_variations) ? product.product_variations : []),
  ];

  return variations.some(isTestProduct);
};

export const isTestProductCatalogPublicationBlocked = (value: unknown): boolean => {
  const product = asRecord(value);
  if (!product || !isTestProduct(product)) return false;

  const variations = [
    ...(Array.isArray(product.variations) ? product.variations : []),
    ...(Array.isArray(product.product_variations) ? product.product_variations : []),
  ];

  return (
    product.status === 'published' ||
    variations.some((variation) => asRecord(variation)?.status === 'published')
  );
};
