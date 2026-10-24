import { beforeEach, describe, expect, it, vi } from 'vitest';

const { supabaseMock } = vi.hoisted(() => ({ supabaseMock: { from: vi.fn() } }));

vi.mock('../../../services/supabaseClient', () => ({ supabase: supabaseMock }));

import { fetchMobileProductsPage } from './mobileProductFetchService';
import {
  PRODUCT_LIST_PRODUCT_AND_LEGACY_ITEM_TYPE_FILTER,
  PRODUCT_LIST_PRODUCT_ITEM_TYPE_FILTER,
} from '../../../../../shared-utils/productListTypeFilters';
import { PRODUCT_LIST_DRAFT_FILTER } from '../../../../../shared-utils/productListDraftFilters';

describe('fetchMobileProductsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('propaga falhas da consulta quando a lista habilita throwOnError', async () => {
    const query: any = {};
    for (const method of ['select', 'or', 'eq', 'order']) {
      query[method] = vi.fn(() => query);
    }
    const queryError = new Error('Falha ao consultar produtos');
    query.range = vi.fn().mockResolvedValue({ data: null, count: null, error: queryError });
    supabaseMock.from.mockReturnValue(query);

    await expect(fetchMobileProductsPage(1, 15, { throwOnError: true })).rejects.toBe(queryError);
  });

  it('usa o predicado compartilhado para categorias primárias, relações e registros legados', async () => {
    const productQuery: any = {};
    for (const method of ['select', 'or', 'eq', 'filter', 'order']) {
      productQuery[method] = vi.fn(() => productQuery);
    }
    productQuery.range = vi.fn().mockResolvedValue({ data: [], count: 0, error: null });
    const categoryQuery: any = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: { name: 'Sala' }, error: null }),
    };
    const categoryLinksQuery: any = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      then: vi.fn((resolve) => resolve({ data: [{ product_id: 'product-1' }], error: null })),
    };
    supabaseMock.from.mockImplementation((table: string) => {
      if (table === 'categories') return categoryQuery;
      if (table === 'product_categories') return categoryLinksQuery;
      return productQuery;
    });

    await fetchMobileProductsPage(1, 15, { category: 'category-1', throwOnError: true });

    expect(productQuery.or).toHaveBeenCalledWith(
      'category_id.eq.category-1,category.eq."Sala",id.in.(product-1)'
    );
    expect(categoryQuery.eq).toHaveBeenCalledWith('id', 'category-1');
    expect(categoryLinksQuery.eq).toHaveBeenCalledWith('category_id', 'category-1');
  });

  it('uses a compact projection for agent summaries and keeps virtual variant SKUs', async () => {
    const query: any = {};
    query.select = vi.fn(() => query);
    query.eq = vi.fn(() => query);
    query.or = vi.fn(() => query);
    query.order = vi.fn(() => query);
    query.range = vi.fn().mockResolvedValue({
      data: [
        {
          id: 'product-1',
          name: 'Mesa Aurora',
          code: 'MESA-1',
          category: 'Sala',
          unit_price: '1200',
          price: '1200',
          promo_price: null,
          cost_price: '800',
          stock: 3,
          active: true,
          status: 'published',
          item_type: 'product',
          is_draft: false,
          product_categories: [],
          product_variations: [],
        },
      ],
      count: 1,
      error: null,
    });
    supabaseMock.from.mockReturnValue(query);

    const result = await fetchMobileProductsPage(1, 10, { summaryOnly: true });

    const [columns, options] = query.select.mock.calls[0];
    expect(columns).toContain('product_variations(');
    expect(columns).not.toContain('product_images');
    expect(columns).not.toContain('*,');
    expect(options).toEqual({ count: 'exact' });
    expect(result.data[0]).toMatchObject({
      name: 'Mesa Aurora',
      unitPrice: 1200,
      costPrice: 800,
      allVariations: [{ sku: 'MESA-1-01' }],
    });
    expect(result.total).toBe(1);
  });

  it('filtra Somente Produtos com composições quando a permissão foi concedida', async () => {
    const query: any = {};
    for (const method of ['select', 'or', 'eq', 'filter', 'order']) {
      query[method] = vi.fn(() => query);
    }
    query.range = vi.fn().mockResolvedValue({ data: [], count: 0, error: null });
    supabaseMock.from.mockReturnValue(query);

    await fetchMobileProductsPage(1, 15, {
      itemType: 'standard',
      generalType: 'product',
      canViewCompositions: true,
    });

    expect(query.or).toHaveBeenCalledWith(PRODUCT_LIST_PRODUCT_ITEM_TYPE_FILTER);
    expect(query.filter).not.toHaveBeenCalledWith('item_type', 'isdistinct', 'composition');
    expect(query.eq).not.toHaveBeenCalledWith('item_type', 'product');
  });

  it('mantém composições fora de Somente Produtos e inclui tipos legados nulos sem permissão', async () => {
    const query: any = {};
    for (const method of ['select', 'or', 'eq', 'filter', 'order']) {
      query[method] = vi.fn(() => query);
    }
    query.range = vi.fn().mockResolvedValue({ data: [], count: 0, error: null });
    supabaseMock.from.mockReturnValue(query);

    await fetchMobileProductsPage(1, 15, {
      itemType: 'standard',
      generalType: 'product',
      canViewCompositions: false,
    });

    expect(query.filter).toHaveBeenCalledWith('item_type', 'isdistinct', 'composition');
    expect(query.or).toHaveBeenCalledWith(PRODUCT_LIST_PRODUCT_AND_LEGACY_ITEM_TYPE_FILTER);
    expect(query.eq).not.toHaveBeenCalledWith('item_type', 'product');
    expect(query.or).not.toHaveBeenCalledWith(PRODUCT_LIST_PRODUCT_ITEM_TYPE_FILTER);
  });

  it('inclui composições no estado Todos quando a permissão foi concedida', async () => {
    const query: any = {};
    for (const method of ['select', 'or', 'eq', 'filter', 'order']) {
      query[method] = vi.fn(() => query);
    }
    query.range = vi.fn().mockResolvedValue({ data: [], count: 0, error: null });
    supabaseMock.from.mockReturnValue(query);

    await fetchMobileProductsPage(1, 15, {
      itemType: 'standard',
      generalType: 'all',
      canViewCompositions: true,
    });

    expect(query.filter).not.toHaveBeenCalledWith('item_type', 'isdistinct', 'composition');
    expect(query.eq).not.toHaveBeenCalledWith('item_type', expect.anything());
    expect(query.or).not.toHaveBeenCalledWith(PRODUCT_LIST_PRODUCT_ITEM_TYPE_FILTER);
  });

  it('mantém composições fora do estado Todos sem a permissão', async () => {
    const query: any = {};
    for (const method of ['select', 'or', 'eq', 'filter', 'order']) {
      query[method] = vi.fn(() => query);
    }
    query.range = vi.fn().mockResolvedValue({ data: [], count: 0, error: null });
    supabaseMock.from.mockReturnValue(query);

    await fetchMobileProductsPage(1, 15, {
      itemType: 'standard',
      generalType: 'all',
      canViewCompositions: false,
    });

    expect(query.filter).toHaveBeenCalledWith('item_type', 'isdistinct', 'composition');
    expect(query.eq).not.toHaveBeenCalledWith('item_type', expect.anything());
  });

  it('usa o predicado compartilhado para localizar rascunhos legados', async () => {
    const query: any = {};
    for (const method of ['select', 'or', 'eq', 'order']) {
      query[method] = vi.fn(() => query);
    }
    query.range = vi.fn().mockResolvedValue({ data: [], count: 0, error: null });
    supabaseMock.from.mockReturnValue(query);

    await fetchMobileProductsPage(1, 15, { statusFilter: 'draft' });

    expect(query.or).toHaveBeenCalledWith(PRODUCT_LIST_DRAFT_FILTER);
  });

  it('limits product autocomplete to active non-draft products from the selected supplier', async () => {
    const query: any = {};
    for (const method of ['select', 'eq', 'or', 'not', 'filter', 'order']) {
      query[method] = vi.fn(() => query);
    }
    query.range = vi.fn().mockResolvedValue({ data: [], count: 0, error: null });
    supabaseMock.from.mockReturnValue(query);

    await fetchMobileProductsPage(1, 25, {
      statusFilter: 'active',
      supplierId: '123e4567-e89b-42d3-a456-426614174000',
    });

    expect(query.eq).toHaveBeenCalledWith('active', true);
    expect(query.not).toHaveBeenCalledWith('is_draft', 'is', true);
    expect(query.filter).toHaveBeenCalledWith('status', 'isdistinct', 'draft');
    expect(query.or).toHaveBeenCalledWith(
      'supplier_id.eq.123e4567-e89b-42d3-a456-426614174000,main_supplier_id.eq.123e4567-e89b-42d3-a456-426614174000,supplier_ids.cs.{"123e4567-e89b-42d3-a456-426614174000"}'
    );
  });

  it('recusa busca truncada quando há mais variações correspondentes que o ERP permite', async () => {
    const productQuery: any = {};
    for (const method of ['select', 'or', 'eq']) {
      productQuery[method] = vi.fn(() => productQuery);
    }

    const variationQuery: any = {};
    variationQuery.select = vi.fn(() => variationQuery);
    variationQuery.or = vi.fn(() => variationQuery);
    variationQuery.limit = vi.fn().mockResolvedValue({
      data: Array.from({ length: 101 }, (_, index) => ({ product_id: `parent-${index}` })),
      error: null,
    });

    supabaseMock.from.mockImplementation((table: string) =>
      table === 'product_variations' ? variationQuery : productQuery
    );

    await expect(fetchMobileProductsPage(1, 10, { search: 'mesa' })).rejects.toMatchObject({
      name: 'ProductVariationSearchTooBroadError',
      message: expect.stringContaining('Refine o termo'),
    });
    expect(variationQuery.limit).toHaveBeenCalledWith(101);
  });

  it('oculta produto cujas variações foram todas mescladas quando includeMerged não é true', async () => {
    const query: any = {};
    query.select = vi.fn(() => query);
    query.eq = vi.fn(() => query);
    query.or = vi.fn(() => query);
    query.filter = vi.fn(() => query);
    query.order = vi.fn(() => query);
    query.range = vi.fn().mockResolvedValue({
      data: [
        {
          id: 'merged-prod',
          name: 'Guarda Roupa Paris',
          code: '000312',
          product_variations: [
            {
              id: 'var-1',
              sku: '000312-01',
              active: true,
              merged_to_variation_id: 'target-var-id',
            },
          ],
        },
      ],
      count: 1,
      error: null,
    });
    supabaseMock.from.mockReturnValue(query);

    const result = await fetchMobileProductsPage(1, 10, { includeMerged: false });
    expect(result.data.length).toBe(0);
  });

  it('inclui produto mesclado e marca isMerged=true quando includeMerged=true', async () => {
    const query: any = {};
    query.select = vi.fn(() => query);
    query.eq = vi.fn(() => query);
    query.or = vi.fn(() => query);
    query.filter = vi.fn(() => query);
    query.order = vi.fn(() => query);
    query.range = vi.fn().mockResolvedValue({
      data: [
        {
          id: 'merged-prod',
          name: 'Guarda Roupa Paris',
          code: '000312',
          product_variations: [
            {
              id: 'var-1',
              sku: '000312-01',
              active: true,
              merged_to_variation_id: 'target-var-id',
            },
          ],
        },
      ],
      count: 1,
      error: null,
    });
    supabaseMock.from.mockReturnValue(query);

    const result = await fetchMobileProductsPage(1, 10, { includeMerged: true });
    expect(result.data.length).toBe(1);
    expect(result.data[0].isMerged).toBe(true);
    expect(result.data[0].allVariations[0].isMerged).toBe(true);
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
