export const HML_FISCAL_TEST_ORDER_MARKER = 'NFE_HML_MATRIX_2026_10';
export const HML_FISCAL_TEST_PRODUCT_MARKER = 'HMLNFTEST';

type UnknownRecord = Record<string, unknown>;

const asRecord = (value: unknown): UnknownRecord | null =>
  value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as UnknownRecord)
    : null;

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

  return [row.notes, row.observation, orderData.notes, orderData.observation].some(
    (text) => typeof text === 'string' && text.includes(HML_FISCAL_TEST_ORDER_MARKER)
  );
};

export const isHmlFiscalTestProduct = (observations: unknown): boolean =>
  typeof observations === 'string' && observations.includes(HML_FISCAL_TEST_PRODUCT_MARKER);
