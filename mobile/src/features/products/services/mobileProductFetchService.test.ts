import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { supabaseMock } = vi.hoisted(() => ({ supabaseMock: { from: vi.fn() } }));

vi.mock('../../../services/supabaseClient', () => ({ supabase: supabaseMock }));

import { fetchMobileProductsPage } from './mobileProductFetchService';
import { resolveMobileProductStatusFilter } from '../domain/mobileProductListFilters';
import {
  PRODUCT_LIST_PRODUCT_AND_LEGACY_ITEM_TYPE_FILTER,
  PRODUCT_LIST_PRODUCT_ITEM_TYPE_FILTER,
} from '../../../../../shared-utils/productListTypeFilters';
import { PRODUCT_LIST_DRAFT_FILTER } from '../../../../../shared-utils/productListDraftFilters';
import { NON_TEST_PRODUCT_ARTIFACT_FILTER } from '../../../../../shared-utils/testArtifactQueries';

describe('fetchMobileProductsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('aborta a consulta paginada e propaga timeout para o estado de erro', async () => {
    vi.useFakeTimers();
    let receivedSignal: AbortSignal | undefined;
    const pendingRequest = new Promise<never>(() => undefined);
    const query: any = {};
    for (const method of ['select', 'eq', 'order']) {
      query[method] = vi.fn(() => query);
    }
    query.range = vi.fn(() => query);
    query.abortSignal = vi.fn((signal: AbortSignal) => {
      receivedSignal = signal;
      return pendingRequest;
    });
    supabaseMock.from.mockReturnValue(query);

    const request = fetchMobileProductsPage(1, 15, {
      showTestProducts: true,
      throwOnError: true,
    });
    const assertion = expect(request).rejects.toThrow('limite de 10000 ms');

    await vi.advanceTimersByTimeAsync(10_000);
    await assertion;

    expect(query.abortSignal).toHaveBeenCalledOnce();
    expect(receivedSignal?.aborted).toBe(true);
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

  it('isola composições e mantém a contagem exata ao buscar outra página', async () => {
    const query: any = {};
    for (const method of ['select', 'or', 'eq', 'filter', 'order']) {
      query[method] = vi.fn(() => query);
    }
    query.range = vi.fn().mockResolvedValue({ data: [], count: 21, error: null });
    supabaseMock.from.mockReturnValue(query);

    const result = await fetchMobileProductsPage(2, 10, {
      itemType: 'composition',
      canViewCompositions: true,
      throwOnError: true,
    });

    expect(query.select).toHaveBeenCalledWith(expect.any(String), { count: 'exact' });
    expect(query.eq).toHaveBeenCalledWith('item_type', 'composition');
    expect(query.filter).not.toHaveBeenCalledWith('item_type', 'isdistinct', 'composition');
    expect(query.range).toHaveBeenCalledWith(10, 19);
    expect(query.eq.mock.invocationCallOrder[0]).toBeLessThan(
      query.range.mock.invocationCallOrder[0]
    );
    expect(result).toEqual({ data: [], total: 21 });
  });

  it('filtra produtos padrão pelo status do Catálogo antes da contagem e do intervalo da página', async () => {
    const query: any = {};
    for (const method of ['select', 'or', 'eq', 'filter', 'order']) {
      query[method] = vi.fn(() => query);
    }
    query.range = vi.fn().mockResolvedValue({ data: [], count: 11, error: null });
    supabaseMock.from.mockReturnValue(query);

    const result = await fetchMobileProductsPage(2, 10, {
      itemType: 'standard',
      catalogStatus: 'published',
      throwOnError: true,
    });

    expect(query.select).toHaveBeenCalledWith(expect.any(String), { count: 'exact' });
    expect(query.filter).toHaveBeenCalledWith('item_type', 'isdistinct', 'composition');
    expect(query.eq).toHaveBeenCalledWith('status', 'published');
    expect(query.range).toHaveBeenCalledWith(10, 19);
    expect(query.eq.mock.invocationCallOrder.at(-1)).toBeLessThan(
      query.range.mock.invocationCallOrder[0]
    );
    expect(result).toEqual({ data: [], total: 11 });
  });

  it('mantém a Lixeira restrita a itens excluídos, deixando inativos para o filtro Desativados', async () => {
    const query: any = {};
    for (const method of ['select', 'or', 'eq', 'filter', 'not', 'order']) {
      query[method] = vi.fn(() => query);
    }
    query.range = vi.fn().mockResolvedValue({ data: [], count: 0, error: null });
    supabaseMock.from.mockReturnValue(query);

    await fetchMobileProductsPage(1, 15, {
      showTrash: true,
      showTestProducts: true,
    });

    expect(query.eq).toHaveBeenCalledWith('deleted', true);
    expect(query.or).not.toHaveBeenCalledWith('active.eq.false,deleted.eq.true');
    expect(query.not).toHaveBeenCalledWith('is_draft', 'is', true);
    expect(query.filter).toHaveBeenCalledWith('status', 'isdistinct', 'draft');
    expect(query.eq).not.toHaveBeenCalledWith('deleted', false);
  });

  it('encontra itens inativos no filtro Desativados sem incluir Lixeira', async () => {
    const query: any = {};
    for (const method of ['select', 'or', 'eq', 'filter', 'not', 'order']) {
      query[method] = vi.fn(() => query);
    }
    query.range = vi.fn().mockResolvedValue({ data: [], count: 0, error: null });
    supabaseMock.from.mockReturnValue(query);

    await fetchMobileProductsPage(1, 15, {
      statusFilter: 'disabled',
      showTrash: false,
      showTestProducts: true,
    });

    expect(query.eq).toHaveBeenCalledWith('deleted', false);
    expect(query.eq).toHaveBeenCalledWith('active', false);
    expect(query.eq).not.toHaveBeenCalledWith('deleted', true);
  });

  it('combina categoria com composição antes da contagem exata e da paginação', async () => {
    const productQuery: any = {};
    for (const method of ['select', 'or', 'eq', 'filter', 'order']) {
      productQuery[method] = vi.fn(() => productQuery);
    }
    productQuery.range = vi.fn().mockResolvedValue({ data: [], count: 21, error: null });
    const categoryQuery: any = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: { name: 'Sala' }, error: null }),
    };
    const categoryLinksQuery: any = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      then: vi.fn((resolve) => resolve({ data: [{ product_id: 'composition-1' }], error: null })),
    };
    supabaseMock.from.mockImplementation((table: string) => {
      if (table === 'categories') return categoryQuery;
      if (table === 'product_categories') return categoryLinksQuery;
      return productQuery;
    });

    const result = await fetchMobileProductsPage(2, 10, {
      itemType: 'composition',
      category: 'category-1',
      canViewCompositions: true,
      throwOnError: true,
    });

    expect(productQuery.select).toHaveBeenCalledWith(expect.any(String), { count: 'exact' });
    expect(productQuery.eq).toHaveBeenCalledWith('item_type', 'composition');
    expect(productQuery.or).toHaveBeenCalledWith(
      'category_id.eq.category-1,category.eq."Sala",id.in.(composition-1)'
    );
    expect(productQuery.range).toHaveBeenCalledWith(10, 19);
    expect(productQuery.eq.mock.invocationCallOrder[0]).toBeLessThan(
      productQuery.range.mock.invocationCallOrder[0]
    );
    expect(
      productQuery.or.mock.invocationCallOrder.some(
        (callOrder) => callOrder < productQuery.range.mock.invocationCallOrder[0]
      )
    ).toBe(true);
    expect(result).toEqual({ data: [], total: 21 });
  });

  it('combina situação no ERP e status do Catálogo em composições antes da contagem exata e paginação', async () => {
    const query: any = {};
    for (const method of ['select', 'or', 'eq', 'not', 'filter', 'order']) {
      query[method] = vi.fn(() => query);
    }
    query.range = vi.fn().mockResolvedValue({ data: [], count: 7, error: null });
    supabaseMock.from.mockReturnValue(query);

    const result = await fetchMobileProductsPage(2, 10, {
      itemType: 'composition',
      statusFilter: 'disabled',
      catalogStatus: 'hidden',
      canViewCompositions: true,
      throwOnError: true,
    });

    expect(query.select).toHaveBeenCalledWith(expect.any(String), { count: 'exact' });
    expect(query.eq).toHaveBeenCalledWith('item_type', 'composition');
    expect(query.not).toHaveBeenCalledWith('is_draft', 'is', true);
    expect(query.filter).toHaveBeenCalledWith('status', 'isdistinct', 'draft');
    expect(query.eq).toHaveBeenCalledWith('active', false);
    expect(query.eq).toHaveBeenCalledWith('status', 'hidden');
    expect(query.range).toHaveBeenCalledWith(10, 19);
    expect(result.total).toBe(7);

    const filterCallOrders = [
      ...query.eq.mock.invocationCallOrder,
      ...query.not.mock.invocationCallOrder,
      ...query.filter.mock.invocationCallOrder,
    ];
    expect(filterCallOrders.every((callOrder) => callOrder < query.range.mock.invocationCallOrder[0])).toBe(true);
  });

  it('busca composição por código do pai e SKU de variação sem ampliar o tipo consultado', async () => {
    const productQuery: any = {};
    for (const method of ['select', 'or', 'eq', 'filter', 'order']) {
      productQuery[method] = vi.fn(() => productQuery);
    }
    productQuery.range = vi.fn().mockResolvedValue({ data: [], count: 21, error: null });
    const variationQuery: any = {
      select: vi.fn(() => variationQuery),
      or: vi.fn(() => variationQuery),
      limit: vi.fn().mockResolvedValue({ data: [{ product_id: 'composition-parent' }], error: null }),
    };
    supabaseMock.from.mockImplementation((table: string) =>
      table === 'product_variations' ? variationQuery : productQuery
    );

    const result = await fetchMobileProductsPage(2, 10, {
      search: 'KTX',
      itemType: 'composition',
      canViewCompositions: true,
      throwOnError: true,
    });

    expect(variationQuery.or).toHaveBeenCalledWith('name.ilike.%KTX%,sku.ilike.%KTX%');
    expect(productQuery.eq).toHaveBeenCalledWith('item_type', 'composition');
    expect(productQuery.or).toHaveBeenCalledWith(
      expect.stringContaining('name.ilike.%KTX%,code.ilike.%KTX%')
    );
    expect(productQuery.or).toHaveBeenCalledWith(
      expect.stringContaining('id.eq.composition-parent')
    );
    expect(productQuery.range).toHaveBeenCalledWith(10, 19);
    expect(result.total).toBe(21);
  });

  it.each(['active', 'disabled'] as const)(
    'suspende o filtro %s durante busca de composição e mantém o filtro do Catálogo',
    async (selectedStatus) => {
      const query: any = {};
      for (const method of ['select', 'or', 'eq', 'not', 'filter', 'order']) {
        query[method] = vi.fn(() => query);
      }
      query.range = vi.fn().mockResolvedValue({ data: [], count: 7, error: null });
      const variationQuery: any = {
        select: vi.fn(() => variationQuery),
        or: vi.fn(() => variationQuery),
        limit: vi.fn().mockResolvedValue({
          data: [{ product_id: 'composition-parent' }],
          error: null,
        }),
      };
      supabaseMock.from.mockImplementation((table: string) =>
        table === 'product_variations' ? variationQuery : query
      );
      const search = 'KTX';

      const result = await fetchMobileProductsPage(1, 10, {
        search,
        statusFilter: resolveMobileProductStatusFilter(selectedStatus, search),
        catalogStatus: 'hidden',
        itemType: 'composition',
        canViewCompositions: true,
        throwOnError: true,
      });

      expect(query.select).toHaveBeenCalledWith(expect.any(String), { count: 'exact' });
      expect(query.eq).toHaveBeenCalledWith('item_type', 'composition');
      expect(query.not).not.toHaveBeenCalledWith('is_draft', 'is', true);
      expect(query.filter).not.toHaveBeenCalledWith('status', 'isdistinct', 'draft');
      expect(query.eq).toHaveBeenCalledWith('status', 'hidden');
      expect(query.eq).not.toHaveBeenCalledWith('active', true);
      expect(query.eq).not.toHaveBeenCalledWith('active', false);
      expect(variationQuery.or).toHaveBeenCalledWith('name.ilike.%KTX%,sku.ilike.%KTX%');
      expect(query.range).toHaveBeenCalledWith(0, 9);
      expect(result.total).toBe(7);
    }
  );

  it('mantém busca de composição em rascunhos quando o status do Catálogo também está selecionado', async () => {
    const query: any = {};
    for (const method of ['select', 'or', 'eq', 'not', 'filter', 'order']) {
      query[method] = vi.fn(() => query);
    }
    query.range = vi.fn().mockResolvedValue({ data: [], count: 3, error: null });
    const variationQuery: any = {
      select: vi.fn(() => variationQuery),
      or: vi.fn(() => variationQuery),
      limit: vi.fn().mockResolvedValue({
        data: [{ product_id: 'composition-draft-parent' }],
        error: null,
      }),
    };
    supabaseMock.from.mockImplementation((table: string) =>
      table === 'product_variations' ? variationQuery : query
    );
    const search = 'KTX';
    const selectedStatus = 'draft' as const;

    const result = await fetchMobileProductsPage(1, 10, {
      search,
      statusFilter: resolveMobileProductStatusFilter(selectedStatus, search),
      catalogStatus: 'hidden',
      itemType: 'composition',
      canViewCompositions: true,
      throwOnError: true,
    });

    expect(query.select).toHaveBeenCalledWith(expect.any(String), { count: 'exact' });
    expect(query.eq).toHaveBeenCalledWith('item_type', 'composition');
    expect(query.or).toHaveBeenCalledWith(PRODUCT_LIST_DRAFT_FILTER);
    expect(query.eq).toHaveBeenCalledWith('status', 'hidden');
    expect(query.not).not.toHaveBeenCalledWith('is_draft', 'is', true);
    expect(query.filter).not.toHaveBeenCalledWith('status', 'isdistinct', 'draft');
    expect(variationQuery.or).toHaveBeenCalledWith('name.ilike.%KTX%,sku.ilike.%KTX%');
    expect(query.range).toHaveBeenCalledWith(0, 9);
    expect(result.total).toBe(3);
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
          sku: 'MESA-CATALOGO',
          category: 'Sala',
          unit_price: '1200',
          price: '1450',
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
      allVariations: [{ sku: 'MESA-CATALOGO-01' }],
    });
    expect(result.total).toBe(1);
  });

  it.each([undefined, { summaryOnly: true }] as const)(
    'loads the legacy category_id name for list cards when normalized links are absent (%o)',
    async (options) => {
      const productQuery: any = {};
      for (const method of ['select', 'or', 'eq', 'filter', 'order']) {
        productQuery[method] = vi.fn(() => productQuery);
      }
      productQuery.range = vi.fn().mockResolvedValue({
        data: [
          {
            id: 'product-legacy-category',
            name: 'Cama Aurora',
            code: 'CAMA-01',
            category_id: 'category-legacy',
            category: '',
            unit_price: 1200,
            stock: 1,
            active: true,
            status: 'published',
            item_type: 'product',
            product_categories: [],
            product_variations: [],
          },
        ],
        count: 1,
        error: null,
      });
      const categoryQuery: any = {
        select: vi.fn().mockReturnThis(),
        in: vi.fn().mockResolvedValue({
          data: [{ id: 'category-legacy', name: 'Quarto' }],
          error: null,
        }),
      };
      supabaseMock.from.mockImplementation((table: string) =>
        table === 'categories' ? categoryQuery : productQuery
      );

      const result = await fetchMobileProductsPage(1, 10, options);

      const selectedColumns = productQuery.select.mock.calls[0][0];
      expect(selectedColumns).toContain(options?.summaryOnly ? 'category_id' : '*, product_variations(');
      expect(categoryQuery.in).toHaveBeenCalledWith('id', ['category-legacy']);
      expect(result.data[0].category).toBe('Quarto');
    }
  );

  it.each([
    ['resposta de erro', false],
    ['requisição rejeitada', true],
  ] as const)(
    'preserva produtos carregados quando falha o enriquecimento da categoria (%s)',
    async (_failureMode, rejectRequest) => {
      const productQuery: any = {};
      for (const method of ['select', 'or', 'eq', 'filter', 'order']) {
        productQuery[method] = vi.fn(() => productQuery);
      }
      productQuery.range = vi.fn().mockResolvedValue({
        data: [
          {
            id: 'product-category-error',
            name: 'Cama Aurora',
            code: 'CAMA-01',
            category_id: 'category-legacy',
            category: 'Categoria legada',
            unit_price: 1200,
            stock: 1,
            active: true,
            status: 'published',
            item_type: 'product',
            product_categories: [],
            product_variations: [],
          },
        ],
        count: 1,
        error: null,
      });
      const categoryError = new Error('Falha ao consultar nomes das categorias');
      const categoryQuery: any = {
        select: vi.fn().mockReturnThis(),
        in: vi.fn(),
      };
      if (rejectRequest) categoryQuery.in.mockRejectedValue(categoryError);
      else categoryQuery.in.mockResolvedValue({ data: null, error: categoryError });
      supabaseMock.from.mockImplementation((table: string) =>
        table === 'categories' ? categoryQuery : productQuery
      );

      vi.spyOn(console, 'warn').mockImplementation(() => undefined);
      const result = await fetchMobileProductsPage(1, 10, { throwOnError: true });

      expect(result).toMatchObject({
        total: 1,
        data: [{ id: 'product-category-error', category: 'Categoria legada' }],
      });
    }
  );

  it('uses legacy parent price when unit_price is null in the list result', async () => {
    const query: any = {};
    for (const method of ['select', 'or', 'eq', 'order']) {
      query[method] = vi.fn(() => query);
    }
    query.range = vi.fn().mockResolvedValue({
      data: [
        {
          id: 'legacy-product',
          name: 'Mesa legada',
          code: 'MESA-LEGADA',
          unit_price: null,
          price: '145.00',
          promo_price: null,
          cost_price: 80,
          stock: 2,
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

    const result = await fetchMobileProductsPage(1, 10);

    expect(query.select.mock.calls[0][0]).toContain('product_variations(*)');
    expect(result.data[0]).toMatchObject({
      unitPrice: 145,
      allVariations: [{ price: 145 }],
    });
  });

  it('normalizes legacy parent and family variation image formats with the ERP parser', async () => {
    const query: any = {};
    for (const method of ['select', 'or', 'eq', 'filter', 'order']) {
      query[method] = vi.fn(() => query);
    }
    query.range = vi.fn().mockResolvedValue({
      data: [
        {
          id: 'product-image-formats',
          name: 'Sofá Aurora',
          code: 'SOFA-1',
          sku: 'SOFA-CATALOGO',
          item_type: 'product',
          status: 'published',
          active: true,
          images: 'https://img.example/parent-a.jpg, https://img.example/parent-b.jpg',
          product_images: [],
          product_categories: [],
          product_variations: [
            {
              id: 'variation-json-images',
              product_id: 'product-image-formats',
              sku: 'SKU-COMERCIAL-AZUL',
              name: 'Sofá Aurora Azul',
              image_url: '["https://img.example/blue-a.jpg", "https://img.example/blue-b.jpg"]',
              images: null,
              active: true,
              stock: 2,
            },
            {
              id: 'variation-object-images',
              product_id: 'product-image-formats',
              sku: null,
              name: 'Sofá Aurora Cinza',
              image_url: null,
              images: [{ url: 'https://img.example/gray.jpg' }],
              active: true,
              stock: 1,
            },
          ],
        },
      ],
      count: 1,
      error: null,
    });
    supabaseMock.from.mockReturnValue(query);

    const result = await fetchMobileProductsPage(1, 10);

    expect(result.data[0].images).toEqual([
      'https://img.example/parent-a.jpg',
      'https://img.example/parent-b.jpg',
    ]);
    expect(result.data[0].allVariations.map((variation: any) => variation.sku)).toEqual([
      'SKU-COMERCIAL-AZUL',
      'SOFA-CATALOGO-02',
    ]);
    expect(result.data[0].allVariations.map((variation: any) => variation.images)).toEqual([
      ['https://img.example/blue-a.jpg', 'https://img.example/blue-b.jpg'],
      ['https://img.example/gray.jpg'],
    ]);
  });

  it('applies the ERP test-artifact predicates before paging and hides test rows by default', async () => {
    const query: any = {};
    for (const method of ['select', 'or', 'eq', 'filter', 'order']) {
      query[method] = vi.fn(() => query);
    }
    query.range = vi.fn().mockResolvedValue({
      data: [{
        id: 'test-product',
        name: '[HML NF TEST] P1',
        code: 'NFEHML26P1',
        item_type: 'product',
        status: 'draft',
        is_draft: true,
        is_test: false,
        technical_specs: { testArtifact: { is_test: true } },
        product_categories: [],
        product_variations: [],
      }],
      count: 1,
      error: null,
    });
    supabaseMock.from.mockReturnValue(query);

    const result = await fetchMobileProductsPage(1, 10, { summaryOnly: true });

    expect(query.or).toHaveBeenCalledWith(NON_TEST_PRODUCT_ARTIFACT_FILTER);
    expect(result.data).toHaveLength(0);
    expect(result.total).toBe(1);
  });

  it('includes marked test rows only when the caller enables administrative visibility', async () => {
    const query: any = {};
    for (const method of ['select', 'or', 'eq', 'filter', 'order']) {
      query[method] = vi.fn(() => query);
    }
    query.range = vi.fn().mockResolvedValue({
      data: [{
        id: 'test-product',
        name: '[HML NF TEST] P1',
        code: 'NFEHML26P1',
        item_type: 'product',
        status: 'draft',
        is_draft: true,
        is_test: true,
        technical_specs: { testArtifact: { is_test: true } },
        product_categories: [],
        product_variations: [],
      }],
      count: 1,
      error: null,
    });
    supabaseMock.from.mockReturnValue(query);

    const result = await fetchMobileProductsPage(1, 10, {
      summaryOnly: true,
      showTestProducts: true,
    });

    expect(query.or).not.toHaveBeenCalledWith(NON_TEST_PRODUCT_ARTIFACT_FILTER);
    expect(query.or).not.toHaveBeenCalledWith('is_test.is.null,is_test.eq.false');
    expect(result.data).toHaveLength(1);
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

  it('não exclui rascunhos quando a busca suspende Ativos/Desativados para todos os estados', async () => {
    const productQuery: any = {};
    for (const method of ['select', 'or', 'eq', 'not', 'filter', 'order']) {
      productQuery[method] = vi.fn(() => productQuery);
    }
    productQuery.range = vi.fn().mockResolvedValue({ data: [], count: 0, error: null });

    const variationQuery: any = {};
    variationQuery.select = vi.fn(() => variationQuery);
    variationQuery.or = vi.fn(() => variationQuery);
    variationQuery.limit = vi.fn().mockResolvedValue({ data: [], error: null });

    supabaseMock.from.mockImplementation((table: string) =>
      table === 'product_variations' ? variationQuery : productQuery
    );

    await fetchMobileProductsPage(1, 15, {
      search: 'mesa',
      statusFilter: 'all',
      includeDeactivated: true,
    });

    expect(productQuery.not).not.toHaveBeenCalledWith('is_draft', 'is', true);
    expect(productQuery.filter).not.toHaveBeenCalledWith('status', 'isdistinct', 'draft');
    expect(productQuery.eq).not.toHaveBeenCalledWith('active', expect.anything());
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
