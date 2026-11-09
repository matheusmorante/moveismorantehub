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

describe('fetchMobileProductsPage composition filters', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
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

});
