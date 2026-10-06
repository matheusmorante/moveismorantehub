import { describe, expect, it } from 'vitest';
import {
  HML_FISCAL_TEST_ORDER_MARKER,
  HML_FISCAL_TEST_PRODUCT_MARKER,
  isHmlFiscalTestOrder,
  isHmlFiscalTestProduct,
} from './hmlTestData';

describe('HML fiscal test data markers', () => {
  it('identifies marked order metadata while leaving ordinary orders untouched', () => {
    expect(
      isHmlFiscalTestOrder({
        is_test: true,
        test_environment: 'homologation',
        testRunId: 'f8ab08d6-c1c5-45a6-9e91-9b54d56e3f4d',
      })
    ).toBe(true);
    expect(isHmlFiscalTestOrder({ notes: `Venda normal ${HML_FISCAL_TEST_ORDER_MARKER}` })).toBe(
      true
    );
    expect(isHmlFiscalTestOrder({ is_test: false, status: 'scheduled' })).toBe(false);
  });

  it('identifies only products with the dedicated dashboard-exclusion marker', () => {
    expect(isHmlFiscalTestProduct(`Produto de teste ${HML_FISCAL_TEST_PRODUCT_MARKER}`)).toBe(
      true
    );
    expect(isHmlFiscalTestProduct('Produto de catálogo')).toBe(false);
    expect(isHmlFiscalTestProduct(null)).toBe(false);
  });
});
