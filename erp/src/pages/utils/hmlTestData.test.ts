import { describe, expect, it } from 'vitest';
import {
  HML_FISCAL_TEST_ORDER_MARKER,
  HML_FISCAL_TEST_PRODUCT_MARKER,
  isHmlFiscalTestOrder,
  isHmlFiscalTestProduct,
  isTestProduct,
  isTestProductCatalogPublicationBlocked,
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

  it('identifies fiscal test products using the legacy and current observation markers', () => {
    expect(isHmlFiscalTestProduct(`Produto de teste ${HML_FISCAL_TEST_PRODUCT_MARKER}`)).toBe(
      true
    );
    expect(isHmlFiscalTestProduct(`Fixture sintética ${HML_FISCAL_TEST_ORDER_MARKER}`)).toBe(true);
    expect(isHmlFiscalTestProduct('Produto de catálogo')).toBe(false);
    expect(isHmlFiscalTestProduct('Descrição com teste do tempo')).toBe(false);
    expect(isHmlFiscalTestProduct(null)).toBe(false);
  });

  it('identifies explicit test product codes and variation labels without matching ordinary copy', () => {
    expect(isTestProduct({ code: 'NFEHML26P1' })).toBe(true);
    expect(isTestProduct({ code: 'TEST_AUT_550e8400-e29b-41d4-a716-446655440000' })).toBe(true);
    expect(isTestProduct({ variations: [{ name: '[HML NF TEST] P5 - Variação A' }] })).toBe(true);
    expect(isTestProduct({ description: 'Produto resistente ao teste do tempo' })).toBe(false);
    expect(
      isTestProductCatalogPublicationBlocked({
        status: 'hidden',
        variations: [],
        product_variations: [{ sku: 'TEST_AUT_fixture', status: 'published' }],
      })
    ).toBe(true);
  });

  it('bloqueia status publicado no pai ou em qualquer variação de produto de teste', () => {
    const observations = `Fixture ${HML_FISCAL_TEST_ORDER_MARKER}`;

    expect(isTestProductCatalogPublicationBlocked({ observations, status: 'published' })).toBe(
      true
    );
    expect(
      isTestProductCatalogPublicationBlocked({
        observations,
        status: 'hidden',
        variations: [{ status: 'hidden' }, { status: 'published' }],
      })
    ).toBe(true);
    expect(
      isTestProductCatalogPublicationBlocked({
        observations,
        status: 'hidden',
        variations: [{ status: 'hidden' }],
      })
    ).toBe(false);
  });
});
