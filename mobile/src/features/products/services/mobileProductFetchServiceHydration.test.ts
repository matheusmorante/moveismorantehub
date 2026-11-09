import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { supabaseMock } = vi.hoisted(() => ({ supabaseMock: { from: vi.fn() } }));

vi.mock('../../../services/supabaseClient', () => ({ supabase: supabaseMock }));

import { fetchMobileProductsPage } from './mobileProductFetchService';

describe('fetchMobileProductsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('restaura detalhes próprios e descarta descontos auxiliares obsoletos do snapshot', async () => {
    const query: any = {};
    query.select = vi.fn(() => query);
    query.eq = vi.fn(() => query);
    query.or = vi.fn(() => query);
    query.filter = vi.fn(() => query);
    query.order = vi.fn(() => query);
    query.range = vi.fn().mockResolvedValue({
      data: [
        {
          id: 'product-1',
          name: 'Guarda Roupa Paris',
          code: '000312',
          unit_price: 1500,
          promo_price: 1350,
          cost_price: 800,
          ipi_percent: 5,
          freight_cost: 25,
          freight_type: 'fixed',
          condition: 'novo',
          width: 200,
          height: 220,
          depth: 60,
          weight: 80,
          active: true,
          status: 'hidden',
          item_type: 'product',
          product_categories: [],
          product_variations: [
            {
              id: 'var-1',
              product_id: 'product-1',
              name: 'Guarda Roupa Paris Branco',
              sku: '000312-01',
              price: 1500,
              cost_price: 760,
              width: 190,
              use_parent_price: true,
              use_parent_promo_price: true,
              use_parent_dimensions: true,
              use_parent_description: true,
              attributes: [{ name: 'Cor', value: 'Branco' }],
            },
            {
              id: 'var-2',
              product_id: 'product-1',
              name: 'Guarda Roupa Paris Azul',
              sku: '000312-02',
              price: 1425,
              promo_price: 1200,
              cost_price: 700,
              use_parent_price: false,
              use_parent_promo_price: false,
              use_parent_dimensions: true,
              use_parent_description: true,
              attributes: [{ name: 'Cor', value: 'Azul' }],
            },
            {
              id: 'var-3',
              product_id: 'product-1',
              name: 'Guarda Roupa Paris Incompleto',
              sku: '000312-03',
              price: 0,
              use_parent_price: false,
              use_parent_promo_price: true,
              use_parent_dimensions: true,
              use_parent_description: true,
              attributes: [{ name: 'Cor', value: 'Incompleto' }],
            },
            {
              id: 'var-4',
              product_id: 'product-1',
              name: 'Guarda Roupa Paris Promoção Própria',
              sku: '000312-04',
              price: 999,
              promo_price: 1100,
              use_parent_price: true,
              use_parent_promo_price: false,
              use_parent_dimensions: true,
              use_parent_description: true,
              attributes: [{ name: 'Cor', value: 'Promoção própria' }],
            },
          ],
          technical_specs: {
            technicalValues: { Marca: 'Morante' },
            variationDetails: [
              {
                id: 'var-1',
                syncCostPrice: false,
                syncWidth: false,
                syncHeight: true,
                syncDepth: true,
                syncWeight: false,
                syncIpi: false,
                syncFreight: false,
                syncFiscal: false,
                syncCondition: false,
                costPrice: 760,
                width: 190,
                weight: 65,
                ipiPercent: 8,
                freightCost: 40,
                freightType: 'fixed',
                condition: 'novo',
                technicalValues: { 'Material da estrutura': 'MDF' },
                fiscal: { ncm: '94035000' },
              },
              {
                id: 'var-2',
                syncCostPrice: false,
                costPrice: 700,
                discountPercent: '150',
                discountFixed: '2000',
              },
            ],
          },
        },
      ],
      count: 1,
      error: null,
    });
    supabaseMock.from.mockReturnValue(query);

    const result = await fetchMobileProductsPage(1, 10);
    const [inheritedVariation, ownPriceVariation] = result.data[0].allVariations;

    expect(inheritedVariation).toMatchObject({
      syncCostPrice: false,
      syncWidth: false,
      syncWeight: false,
      syncIpi: false,
      syncFreight: false,
      syncFiscal: false,
      syncCondition: false,
      costPrice: 760,
      width: 190,
      weight: 65,
      ipiPercent: 8,
      freightCost: 40,
      technicalValues: { 'Material da estrutura': 'MDF' },
      fiscal: { ncm: '94035000' },
      unitPrice: 1500,
      promoPrice: 1350,
    });
    expect(ownPriceVariation).toMatchObject({
      syncUnitPrice: false,
      syncPromoPrice: false,
      syncCostPrice: false,
      unitPrice: 1425,
      promoPrice: 1200,
      costPrice: 700,
    });
    expect(ownPriceVariation).not.toHaveProperty('discountPercent');
    expect(ownPriceVariation).not.toHaveProperty('discountFixed');
    expect(result.data[0].allVariations[2]).toMatchObject({
      syncUnitPrice: false,
      syncPromoPrice: true,
      unitPrice: 0,
      promoPrice: 1350,
    });
    expect(result.data[0].allVariations[3]).toMatchObject({
      syncUnitPrice: true,
      syncPromoPrice: false,
      unitPrice: 1500,
      promoPrice: 1100,
    });
  });

  it('restaura override técnico próprio explicitamente vazio sem convertê-lo em herança', async () => {
    const query: any = {};
    for (const method of ['select', 'eq', 'or', 'filter', 'order']) {
      query[method] = vi.fn(() => query);
    }
    query.range = vi.fn().mockResolvedValue({
      data: [
        {
          id: 'product-1',
          name: 'Produto de teste',
          code: 'PROD',
          unit_price: 100,
          active: true,
          status: 'hidden',
          item_type: 'product',
          product_categories: [],
          product_variations: [
            {
              id: 'variation-1',
              product_id: 'product-1',
              name: 'Produto de teste',
              sku: 'PROD-01',
              attributes: [],
            },
          ],
          technical_specs: {
            technicalValues: { Cor: 'Azul' },
            variableTechnicalFields: ['Cor'],
            variationDetails: [{ id: 'variation-1', technicalValues: { Cor: '' } }],
          },
        },
      ],
      count: 1,
      error: null,
    });
    supabaseMock.from.mockReturnValue(query);

    const result = await fetchMobileProductsPage(1, 10);
    const variation = result.data[0].allVariations[0];

    expect(variation.technicalValues).toEqual({ Cor: '' });
    expect(variation.attributes).toEqual([]);
  });

  it('normaliza nome e valor dos atributos da variação como o ERP ao reabrir o produto', async () => {
    const query: any = {};
    for (const method of ['select', 'eq', 'or', 'filter', 'order']) {
      query[method] = vi.fn(() => query);
    }
    query.range = vi.fn().mockResolvedValue({
      data: [
        {
          id: 'product-attributes',
          name: 'Armario',
          code: '003963',
          active: true,
          status: 'hidden',
          item_type: 'product',
          product_categories: [],
          product_variations: [
            {
              id: 'variation-attributes',
              product_id: 'product-attributes',
              name: 'Armario Branco',
              sku: '003963-01',
              attributes: [
                { attribute_name: 'quantidade de portas', option: '6 PORTAS', showName: false },
                { name: 'material', value: 'MDF' },
                { name: 'acabamento incompleto', value: '' },
              ],
            },
          ],
        },
      ],
      count: 1,
      error: null,
    });
    supabaseMock.from.mockReturnValue(query);

    const result = await fetchMobileProductsPage(1, 10);

    expect(result.data[0].allVariations[0].attributes).toEqual([
      { name: 'Quantidade de Portas', value: '6 Portas', showName: false },
      { name: 'Material', value: 'MDF', showName: true },
    ]);
  });

  it('rehidrata valores técnicos próprios de cada variação pelo UUID, sem depender da ordem dos detalhes', async () => {
    const query: any = {};
    for (const method of ['select', 'eq', 'or', 'filter', 'order']) {
      query[method] = vi.fn(() => query);
    }
    query.range = vi.fn().mockResolvedValue({
      data: [
        {
          id: 'product-1',
          name: 'Armario',
          code: '003962',
          active: true,
          status: 'hidden',
          item_type: 'product',
          product_categories: [],
          product_variations: [
            {
              id: 'variation-blue',
              product_id: 'product-1',
              name: 'Armario Azul',
              sku: '003962-01',
              attributes: [],
            },
            {
              id: 'variation-green',
              product_id: 'product-1',
              name: 'Armario Verde',
              sku: '003962-02',
              attributes: [],
            },
          ],
          technical_specs: {
            technicalValues: { Cor: 'Azul' },
            variableTechnicalFields: ['Cor'],
            variationDetails: [
              { id: 'variation-green', technicalValues: { Cor: 'Verde' } },
              { id: 'variation-blue', technicalValues: { Cor: 'Azul' } },
            ],
          },
        },
      ],
      count: 1,
      error: null,
    });
    supabaseMock.from.mockReturnValue(query);

    const result = await fetchMobileProductsPage(1, 10);
    const valuesById = Object.fromEntries(
      result.data[0].allVariations.map((variation: any) => [variation.id, variation.technicalValues?.Cor])
    );

    expect(valuesById).toEqual({ 'variation-blue': 'Azul', 'variation-green': 'Verde' });
  });

});
