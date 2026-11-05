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

  it('reabre família de composição em rascunho com a versão mais recente dos preços próprios e herdados', async () => {
    const productId = '123e4567-e89b-42d3-a456-426614174060';
    const ownPriceVariationId = '123e4567-e89b-42d3-a456-426614174061';
    const inheritedPriceVariationId = '123e4567-e89b-42d3-a456-426614174062';
    const query: any = {};
    for (const method of ['select', 'or', 'eq', 'filter', 'order']) {
      query[method] = vi.fn(() => query);
    }
    query.range = vi.fn().mockResolvedValue({
      data: [
        {
          id: productId,
          name: 'Kit em rascunho',
          code: 'KIT-RASCUNHO',
          item_type: 'composition',
          has_variations: true,
          is_combo: true,
          is_draft: true,
          status: 'draft',
          active: false,
          unit_price: 220,
          promo_price: 180,
          combo_items: [],
          product_categories: [],
          product_variations: [
            {
              id: ownPriceVariationId,
              product_id: productId,
              name: 'Kit Azul',
              sku: 'KIT-RASCUNHO-01',
              price: 165,
              promo_price: 140,
              use_parent_price: false,
              use_parent_promo_price: false,
              active: false,
              status: 'draft',
              stock: 0,
              combo_items: [],
              attributes: [],
            },
            {
              id: inheritedPriceVariationId,
              product_id: productId,
              name: 'Kit Verde',
              sku: 'KIT-RASCUNHO-02',
              price: 220,
              promo_price: 180,
              use_parent_price: true,
              use_parent_promo_price: true,
              active: false,
              status: 'draft',
              stock: 0,
              combo_items: [],
              attributes: [],
            },
          ],
          technical_specs: {
            variationDetails: [
              {
                id: ownPriceVariationId,
                syncUnitPrice: false,
                syncPromoPrice: false,
                syncCostPrice: false,
                costPrice: '40,00',
              },
              {
                id: inheritedPriceVariationId,
                syncUnitPrice: true,
                syncPromoPrice: true,
                syncCostPrice: true,
              },
            ],
            draftProduct: {
              id: productId,
              isDraft: true,
              active: false,
              status: 'draft',
              itemType: 'composition',
              hasVariations: true,
              unitPrice: '220,00',
              promoPrice: '180,00',
              variations: [
                {
                  id: ownPriceVariationId,
                  name: 'Kit Azul',
                  price: '165,00',
                  unitPrice: '165,00',
                  promoPrice: '140,00',
                  costPrice: '40,00',
                  syncUnitPrice: false,
                  syncPromoPrice: false,
                  syncCostPrice: false,
                  comboItems: [],
                },
                {
                  id: inheritedPriceVariationId,
                  name: 'Kit Verde',
                  price: '220,00',
                  unitPrice: '220,00',
                  promoPrice: '180,00',
                  costPrice: '50,00',
                  syncUnitPrice: true,
                  syncPromoPrice: true,
                  syncCostPrice: true,
                  comboItems: [],
                },
              ],
            },
          },
        },
      ],
      count: 1,
      error: null,
    });
    supabaseMock.from.mockReturnValue(query);

    const result = await fetchMobileProductsPage(1, 10);

    expect(result.data[0]).toMatchObject({
      id: productId,
      itemType: 'composition',
      isDraft: true,
      hasVariations: true,
      active: false,
      unitPrice: 220,
      promoPrice: 180,
    });
    expect(result.data[0].variations).toMatchObject([
      {
        id: ownPriceVariationId,
        unitPrice: 165,
        promoPrice: 140,
        costPrice: '40,00',
        syncUnitPrice: false,
        syncPromoPrice: false,
        syncCostPrice: false,
      },
      {
        id: inheritedPriceVariationId,
        unitPrice: 220,
        promoPrice: 180,
        costPrice: '50,00',
        syncUnitPrice: true,
        syncPromoPrice: true,
        syncCostPrice: true,
      },
    ]);
  });

  it('reabre composição concluída pelas linhas atuais e ignora snapshot de rascunho', async () => {
    const productId = 'completed-composition';
    const ownVariationId = 'completed-composition-own-variation';
    const inheritedVariationId = 'completed-composition-inherited-variation';
    const ownComboItems = [{ productId: 'component-product', variationId: 'component-blue', quantity: 1 }];
    const inheritedComboItems = [{ productId: 'component-product', variationId: 'component-green', quantity: 2 }];
    const productQuery: any = {};
    for (const method of ['select', 'or', 'eq', 'filter', 'order', 'not']) {
      productQuery[method] = vi.fn(() => productQuery);
    }
    productQuery.range = vi.fn().mockResolvedValue({
      data: [{
        id: productId,
        name: 'Kit finalizado',
        code: 'KIT-FINAL',
        item_type: 'composition',
        is_combo: true,
        is_draft: false,
        has_variations: true,
        active: true,
        status: 'published',
        unit_price: 220,
        promo_price: 180,
        cost_price: 50,
        combo_items: [],
        product_categories: [],
        product_images: [],
        technical_specs: {
          draftProduct: null,
          variationDetails: [
            { id: ownVariationId, syncCostPrice: false, costPrice: 40 },
            { id: inheritedVariationId, syncCostPrice: true },
          ],
        },
        product_variations: [
          {
            id: ownVariationId,
            product_id: productId,
            sku: 'KIT-FINAL-01',
            name: 'Kit Azul',
            active: true,
            status: 'published',
            price: 165,
            promo_price: 140,
            cost_price: 31,
            use_parent_price: false,
            use_parent_promo_price: false,
            combo_items: ownComboItems,
            attributes: [],
          },
          {
            id: inheritedVariationId,
            product_id: productId,
            sku: 'KIT-FINAL-02',
            name: 'Kit Verde',
            active: true,
            status: 'published',
            price: 99,
            promo_price: 88,
            cost_price: 22,
            use_parent_price: true,
            use_parent_promo_price: true,
            combo_items: inheritedComboItems,
            attributes: [],
          },
        ],
      }],
      count: 1,
      error: null,
    });
    const componentStockQuery: any = {
      select: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      then: (resolve: (value: unknown) => unknown) => Promise.resolve({
        data: [{
          id: 'component-product',
          stock: 10,
          product_variations: [
            { id: 'component-blue', stock: 8 },
            { id: 'component-green', stock: 6 },
          ],
        }],
        error: null,
      }).then(resolve),
    };
    supabaseMock.from
      .mockReturnValueOnce(productQuery)
      .mockReturnValueOnce(componentStockQuery);

    const result = await fetchMobileProductsPage(1, 10);

    expect(result.data[0]).toMatchObject({
      id: productId,
      itemType: 'composition',
      isDraft: false,
      isCombo: true,
      is_combo: true,
      hasVariations: true,
      unitPrice: 220,
      promoPrice: 180,
      technicalSpecs: { draftProduct: null },
    });
    expect(result.data[0].variations).toMatchObject([
      {
        id: ownVariationId,
        unitPrice: 165,
        promoPrice: 140,
        syncUnitPrice: false,
        syncPromoPrice: false,
        comboItems: ownComboItems,
        stock: 8,
      },
      {
        id: inheritedVariationId,
        unitPrice: 220,
        promoPrice: 180,
        syncUnitPrice: true,
        syncPromoPrice: true,
        comboItems: inheritedComboItems,
        stock: 3,
      },
    ]);
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

  it('preserva has_variations de composição com uma única variação, como o ERP', async () => {
    const query: any = {};
    for (const method of ['select', 'eq', 'or', 'not', 'filter', 'order']) {
      query[method] = vi.fn(() => query);
    }
    query.range = vi.fn().mockResolvedValue({
      data: [
        {
          id: 'composition-1',
          name: 'Kit sala',
          code: 'KIT-1',
          item_type: 'composition',
          has_variations: true,
          is_combo: true,
          combo_items: [],
          product_categories: [],
          product_variations: [
            {
              id: 'composition-var-1',
              product_id: 'composition-1',
              name: 'Kit sala',
              sku: 'KIT-1-01',
              active: true,
              attributes: [],
              combo_items: [],
            },
          ],
        },
      ],
      count: 1,
      error: null,
    });
    supabaseMock.from.mockReturnValue(query);

    const result = await fetchMobileProductsPage(1, 10);

    expect(result.data[0]).toMatchObject({ itemType: 'composition', hasVariations: true });
  });

  it('rehidrata componentes do pai e da variação sem misturar as duas listas', async () => {
    const rootItems = [
      { productId: 'component-root', variationId: null, quantity: 2, description: 'Base' },
    ];
    const variationItems = [
      {
        productId: 'component-variation',
        variationId: 'component-variation-row',
        quantity: 1.5,
        description: 'Acabamento azul',
      },
    ];
    const productQuery: any = {};
    for (const method of ['select', 'eq', 'or', 'not', 'filter', 'order']) {
      productQuery[method] = vi.fn(() => productQuery);
    }
    productQuery.range = vi.fn().mockResolvedValue({
      data: [
        {
          id: 'composition-1',
          name: 'Kit modular',
          item_type: 'composition',
          is_draft: false,
          status: 'published',
          has_variations: true,
          combo_items: rootItems,
          product_categories: [],
          product_variations: [
            {
              id: 'composition-row',
              product_id: 'composition-1',
              name: 'Kit modular azul',
              sku: 'KIT-01',
              active: true,
              attributes: [],
              combo_items: variationItems,
            },
          ],
        },
      ],
      count: 1,
      error: null,
    });
    const stockQuery: any = {
      select: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      then: (resolve: (value: unknown) => unknown) =>
        Promise.resolve({ data: [], error: null }).then(resolve),
    };
    supabaseMock.from
      .mockReturnValueOnce(productQuery)
      .mockReturnValueOnce(stockQuery);

    const result = await fetchMobileProductsPage(1, 10);

    expect(result.data[0].comboItems).toEqual(rootItems);
    expect(result.data[0].variations[0].comboItems).toEqual(variationItems);
    expect(result.data[0].allVariations[0].comboItems).toEqual(variationItems);
  });

  it('não infla o estoque de uma composição quando um componente tem quantidade inválida', async () => {
    const productQuery: any = {};
    for (const method of ['select', 'eq', 'or', 'not', 'filter', 'order']) {
      productQuery[method] = vi.fn(() => productQuery);
    }
    productQuery.range = vi.fn().mockResolvedValue({
      data: [
        {
          id: 'composition-1',
          name: 'Kit teste',
          code: 'KIT-1',
          unit_price: 100,
          stock: 99,
          active: true,
          status: 'published',
          item_type: 'composition',
          product_categories: [],
          product_variations: [],
          combo_items: [
            { productId: 'part-1', quantity: 2 },
            { productId: 'part-2', quantity: 0 },
          ],
        },
      ],
      count: 1,
      error: null,
    });

    const stockQuery: any = {};
    stockQuery.select = vi.fn(() => stockQuery);
    stockQuery.in = vi.fn(() => stockQuery);
    stockQuery.then = (resolve: (value: unknown) => unknown) =>
      Promise.resolve({
        data: [
          { id: 'part-1', stock: 20, product_variations: [] },
          { id: 'part-2', stock: 20, product_variations: [] },
        ],
        error: null,
      }).then(resolve);

    supabaseMock.from.mockReturnValueOnce(productQuery).mockReturnValueOnce(stockQuery);

    const result = await fetchMobileProductsPage(1, 10, { summaryOnly: true });

    expect(result.data[0].stock).toBe(0);
  });
});
