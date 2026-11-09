import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { supabaseMock } = vi.hoisted(() => ({ supabaseMock: { from: vi.fn() } }));

vi.mock('../../../services/supabaseClient', () => ({ supabase: supabaseMock }));

import { fetchMobileProductsPage } from './mobileProductFetchService';
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

});
