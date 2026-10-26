import { describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ from: vi.fn() }));
vi.mock('@/pages/utils/supabaseConfig', () => ({
  supabase: { from: mocks.from },
  isTestEnvironment: false,
}));

import { applyProductFiltersAndSort } from './productFilterBuilder';
import { PRODUCT_LIST_PRODUCT_ITEM_TYPE_FILTER } from '../../../../../shared-utils/productListTypeFilters';
import { PRODUCT_LIST_DRAFT_FILTER } from '../../../../../shared-utils/productListDraftFilters';

describe('productFilterBuilder', () => {
  it('aborta a consulta paginada e propaga timeout ao chamador', async () => {
    vi.useFakeTimers();
    let receivedSignal: AbortSignal | undefined;
    const pendingRequest = new Promise<never>(() => undefined);
    const mockQuery: any = {
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      range: vi.fn().mockReturnThis(),
      abortSignal: vi.fn((signal: AbortSignal) => {
        receivedSignal = signal;
        return pendingRequest;
      }),
    };
    const request = applyProductFiltersAndSort(
      mockQuery,
      {},
      { orderColumn: 'created_at', ascending: false, from: 0, to: 14 }
    );
    const assertion = expect(request).rejects.toThrow('limite de 10000 ms');

    try {
      await vi.advanceTimersByTimeAsync(10_000);
      await assertion;

      expect(mockQuery.abortSignal).toHaveBeenCalledOnce();
      expect(receivedSignal?.aborted).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });

  it('aplica filtro de fornecedor quando supplierId é fornecido', async () => {
    const mockQuery: any = {
      eq: vi.fn().mockReturnThis(),
      not: vi.fn().mockReturnThis(),
      filter: vi.fn().mockReturnThis(),
      or: vi.fn().mockReturnThis(),
      then: vi.fn((resolve) => resolve({ data: [], error: null })),
    };

    await applyProductFiltersAndSort(mockQuery, { supplierId: 'forn-123' });

    expect(mockQuery.or).toHaveBeenCalledWith(
      'supplier_id.eq.forn-123,main_supplier_id.eq.forn-123,supplier_ids.cs.{"forn-123"}'
    );
  });

  it('não adiciona filtro de fornecedor quando supplierId não é fornecido', async () => {
    const mockQuery: any = {
      eq: vi.fn().mockReturnThis(),
      not: vi.fn().mockReturnThis(),
      or: vi.fn().mockReturnThis(),
      then: vi.fn((resolve) => resolve({ data: [], error: null })),
    };

    await applyProductFiltersAndSort(mockQuery, {});

    expect(mockQuery.or).not.toHaveBeenCalledWith(expect.stringContaining('supplier_id.eq.'));
  });

  it('filtra Somente Produtos incluindo produtos, composições e registros legados', async () => {
    const mockQuery: any = {
      eq: vi.fn().mockReturnThis(),
      or: vi.fn().mockReturnThis(),
      then: vi.fn((resolve) => resolve({ data: [], error: null })),
    };

    await applyProductFiltersAndSort(mockQuery, { category: 'Produtos' });

    expect(mockQuery.or).toHaveBeenCalledWith(PRODUCT_LIST_PRODUCT_ITEM_TYPE_FILTER);
  });

  it('filtra rascunhos por is_draft ou pelo status legado', async () => {
    const mockQuery: any = {
      eq: vi.fn().mockReturnThis(),
      or: vi.fn().mockReturnThis(),
      then: vi.fn((resolve) => resolve({ data: [], error: null })),
    };

    await applyProductFiltersAndSort(mockQuery, { isDraft: true });

    expect(mockQuery.or).toHaveBeenCalledWith(PRODUCT_LIST_DRAFT_FILTER);
    expect(mockQuery.eq).not.toHaveBeenCalledWith('is_draft', true);
  });

  it('filtra categoria por UUID primário, relação normalizada e nome legado', async () => {
    const categoryQuery: any = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: { name: 'Sala' }, error: null }),
    };
    const categoryLinksQuery: any = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      then: vi.fn((resolve) =>
        resolve({ data: [{ product_id: 'product-1' }, { product_id: 'product-2' }], error: null })
      ),
    };
    mocks.from.mockImplementation((table: string) =>
      table === 'categories' ? categoryQuery : categoryLinksQuery
    );
    const mockQuery: any = {
      eq: vi.fn().mockReturnThis(),
      or: vi.fn().mockReturnThis(),
      then: vi.fn((resolve) => resolve({ data: [], error: null })),
    };

    await applyProductFiltersAndSort(mockQuery, { category: 'category-1' });

    expect(categoryQuery.eq).toHaveBeenCalledWith('id', 'category-1');
    expect(categoryLinksQuery.eq).toHaveBeenCalledWith('category_id', 'category-1');
    expect(mockQuery.or).toHaveBeenCalledWith(
      'category_id.eq.category-1,category.eq."Sala",id.in.(product-1,product-2)'
    );
    expect(mockQuery.eq).not.toHaveBeenCalledWith('category', 'category-1');
  });

  it('combina categoria com item_type de composição antes de paginar', async () => {
    const categoryQuery: any = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: { name: 'Sala' }, error: null }),
    };
    const categoryLinksQuery: any = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      then: vi.fn((resolve) =>
        resolve({ data: [{ product_id: 'composition-1' }], error: null })
      ),
    };
    mocks.from.mockImplementation((table: string) =>
      table === 'categories' ? categoryQuery : categoryLinksQuery
    );
    const productQuery: any = {
      eq: vi.fn().mockReturnThis(),
      not: vi.fn().mockReturnThis(),
      filter: vi.fn().mockReturnThis(),
      or: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      range: vi.fn().mockReturnThis(),
      then: vi.fn((resolve) => resolve({ data: [], count: 21, error: null })),
    };

    await applyProductFiltersAndSort(
      productQuery,
      { itemType: 'composition', category: 'category-1' },
      { orderColumn: 'created_at', ascending: false, from: 10, to: 19 }
    );

    expect(productQuery.eq).toHaveBeenCalledWith('item_type', 'composition');
    expect(productQuery.or).toHaveBeenCalledWith(
      'category_id.eq.category-1,category.eq."Sala",id.in.(composition-1)'
    );
    expect(productQuery.range).toHaveBeenCalledWith(10, 19);
    expect(productQuery.eq.mock.invocationCallOrder[1]).toBeLessThan(
      productQuery.range.mock.invocationCallOrder[0]
    );
    expect(
      productQuery.or.mock.invocationCallOrder.some(
        (callOrder) => callOrder < productQuery.range.mock.invocationCallOrder[0]
      )
    ).toBe(true);
  });

  it('combina situação no ERP e status do Catálogo em composições antes de paginar', async () => {
    const productQuery: any = {
      eq: vi.fn().mockReturnThis(),
      not: vi.fn().mockReturnThis(),
      filter: vi.fn().mockReturnThis(),
      or: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      range: vi.fn().mockReturnThis(),
      then: vi.fn((resolve) => resolve({ data: [], count: 7, error: null })),
    };

    await applyProductFiltersAndSort(
      productQuery,
      {
        itemType: 'composition',
        isDraft: false,
        activeOnly: false,
        status: 'hidden',
      },
      { orderColumn: 'created_at', ascending: false, from: 10, to: 19 }
    );

    expect(productQuery.eq).toHaveBeenCalledWith('item_type', 'composition');
    expect(productQuery.not).toHaveBeenCalledWith('is_draft', 'is', true);
    expect(productQuery.filter).toHaveBeenCalledWith('status', 'isdistinct', 'draft');
    expect(productQuery.eq).toHaveBeenCalledWith('active', false);
    expect(productQuery.eq).toHaveBeenCalledWith('status', 'hidden');
    expect(productQuery.range).toHaveBeenCalledWith(10, 19);

    const filterCallOrders = [
      ...productQuery.eq.mock.invocationCallOrder,
      ...productQuery.not.mock.invocationCallOrder,
      ...productQuery.filter.mock.invocationCallOrder,
    ];
    expect(filterCallOrders.every((callOrder) => callOrder < productQuery.range.mock.invocationCallOrder[0])).toBe(true);
  });

  it('filtra produtos padrão pelo status do Catálogo antes do intervalo da página', async () => {
    const productQuery: any = {
      eq: vi.fn().mockReturnThis(),
      not: vi.fn().mockReturnThis(),
      filter: vi.fn().mockReturnThis(),
      or: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      range: vi.fn().mockReturnThis(),
      then: vi.fn((resolve) => resolve({ data: [], count: 11, error: null })),
    };

    await applyProductFiltersAndSort(
      productQuery,
      { excludeItemType: 'composition', status: 'published' },
      { orderColumn: 'created_at', ascending: false, from: 10, to: 19 }
    );

    expect(productQuery.filter).toHaveBeenCalledWith('item_type', 'isdistinct', 'composition');
    expect(productQuery.eq).toHaveBeenCalledWith('status', 'published');
    expect(productQuery.range).toHaveBeenCalledWith(10, 19);
    expect(productQuery.eq.mock.invocationCallOrder.at(-1)).toBeLessThan(
      productQuery.range.mock.invocationCallOrder[0]
    );
  });

  it('busca na lixeira somente itens excluídos e omite rascunhos', async () => {
    const mockQuery: any = {
      eq: vi.fn().mockReturnThis(),
      not: vi.fn().mockReturnThis(),
      filter: vi.fn().mockReturnThis(),
      or: vi.fn().mockReturnThis(),
      then: vi.fn((resolve) => resolve({ data: [], error: null })),
    };

    await applyProductFiltersAndSort(mockQuery, {
      showTrash: true,
      activeOnly: false,
    });

    expect(mockQuery.eq).toHaveBeenCalledWith('deleted', true);
    expect(mockQuery.eq).not.toHaveBeenCalledWith('active', false);
    expect(mockQuery.or).not.toHaveBeenCalledWith('active.eq.false,deleted.eq.true');
    expect(mockQuery.not).toHaveBeenCalledWith('is_draft', 'is', true);
    expect(mockQuery.filter).toHaveBeenCalledWith('status', 'isdistinct', 'draft');
  });

  it('does not apply the default deactivated-product filter to the trash', async () => {
    const mockQuery: any = {
      eq: vi.fn().mockReturnThis(),
      not: vi.fn().mockReturnThis(),
      filter: vi.fn().mockReturnThis(),
      or: vi.fn().mockReturnThis(),
      then: vi.fn((resolve) => resolve({ data: [], error: null })),
    };

    await applyProductFiltersAndSort(mockQuery, {
      showTrash: true,
      includeDeactivated: false,
    });

    expect(mockQuery.eq).toHaveBeenCalledWith('deleted', true);
    expect(mockQuery.or).not.toHaveBeenCalledWith('active.eq.true,is_draft.eq.true');
  });

  it('exclui rascunhos legados pelo status ao solicitar registros não rascunho', async () => {
    const mockQuery: any = {
      eq: vi.fn().mockReturnThis(),
      not: vi.fn().mockReturnThis(),
      filter: vi.fn().mockReturnThis(),
      then: vi.fn((resolve) => resolve({ data: [], error: null })),
    };

    await applyProductFiltersAndSort(mockQuery, { isDraft: false });

    expect(mockQuery.not).toHaveBeenCalledWith('is_draft', 'is', true);
    expect(mockQuery.filter).toHaveBeenCalledWith('status', 'isdistinct', 'draft');
  });

  it('propaga falha ao consultar nomes de variações em vez de retornar busca parcial', async () => {
    const variationError = new Error('falha ao consultar variações');
    const variationQuery: any = {
      select: vi.fn(() => variationQuery),
      or: vi.fn(() => variationQuery),
      limit: vi.fn(async () => ({ data: null, error: variationError })),
    };
    mocks.from.mockReturnValue(variationQuery);
    const productQuery: any = {
      eq: vi.fn().mockReturnThis(),
      not: vi.fn().mockReturnThis(),
      or: vi.fn().mockReturnThis(),
    };

    await expect(
      applyProductFiltersAndSort(productQuery, { search: 'mesa' })
    ).rejects.toBe(variationError);
    expect(productQuery.or).not.toHaveBeenCalled();
  });

  it('recusa resultado truncado quando a busca excede o limite de variações', async () => {
    const variationQuery: any = {
      select: vi.fn(() => variationQuery),
      or: vi.fn(() => variationQuery),
      limit: vi.fn(async () => ({
        data: Array.from({ length: 101 }, (_, index) => ({ product_id: `parent-${index}` })),
        error: null,
      })),
    };
    mocks.from.mockReturnValue(variationQuery);
    const productQuery: any = { eq: vi.fn().mockReturnThis() };

    await expect(
      applyProductFiltersAndSort(productQuery, { search: 'mesa' })
    ).rejects.toMatchObject({
      name: 'ProductVariationSearchTooBroadError',
      message: expect.stringContaining('Refine o termo'),
    });
    expect(variationQuery.limit).toHaveBeenCalledWith(101);
  });

  it('mantém produtos legados sem item_type ao excluir composições', async () => {
    const mockQuery: any = {
      eq: vi.fn().mockReturnThis(),
      not: vi.fn().mockReturnThis(),
      filter: vi.fn().mockReturnThis(),
      neq: vi.fn().mockReturnThis(),
      or: vi.fn().mockReturnThis(),
      then: vi.fn((resolve) => resolve({ data: [], error: null })),
    };

    await applyProductFiltersAndSort(mockQuery, { excludeItemType: 'composition' });

    expect(mockQuery.filter).toHaveBeenCalledWith('item_type', 'isdistinct', 'composition');
    expect(mockQuery.neq).not.toHaveBeenCalledWith('item_type', 'composition');
  });

  it('isola composições antes de paginar o intervalo solicitado', async () => {
    const mockQuery: any = {
      eq: vi.fn().mockReturnThis(),
      not: vi.fn().mockReturnThis(),
      filter: vi.fn().mockReturnThis(),
      or: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      range: vi.fn().mockReturnThis(),
      then: vi.fn((resolve) => resolve({ data: [], count: 21, error: null })),
    };

    await applyProductFiltersAndSort(
      mockQuery,
      { itemType: 'composition' },
      { orderColumn: 'created_at', ascending: false, from: 10, to: 19 }
    );

    expect(mockQuery.eq).toHaveBeenCalledWith('item_type', 'composition');
    expect(mockQuery.range).toHaveBeenCalledWith(10, 19);
    expect(mockQuery.eq.mock.invocationCallOrder[0]).toBeLessThan(
      mockQuery.range.mock.invocationCallOrder[0]
    );
  });

  it('busca uma composição por código do pai e SKU da variação sem perder o filtro de tipo', async () => {
    const variationQuery: any = {
      select: vi.fn(() => variationQuery),
      or: vi.fn(() => variationQuery),
      limit: vi.fn().mockResolvedValue({ data: [{ product_id: 'composition-parent' }], error: null }),
    };
    mocks.from.mockReturnValue(variationQuery);
    const productQuery: any = {
      eq: vi.fn().mockReturnThis(),
      not: vi.fn().mockReturnThis(),
      filter: vi.fn().mockReturnThis(),
      or: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      range: vi.fn().mockReturnThis(),
      then: vi.fn((resolve) => resolve({ data: [], count: 21, error: null })),
    };

    await applyProductFiltersAndSort(
      productQuery,
      { itemType: 'composition', search: 'KTX', isDraft: false, status: 'hidden' },
      { orderColumn: 'created_at', ascending: false, from: 10, to: 19 }
    );

    expect(variationQuery.or).toHaveBeenCalledWith('name.ilike.%KTX%,sku.ilike.%KTX%');
    expect(productQuery.eq).toHaveBeenCalledWith('item_type', 'composition');
    expect(productQuery.not).toHaveBeenCalledWith('is_draft', 'is', true);
    expect(productQuery.filter).toHaveBeenCalledWith('status', 'isdistinct', 'draft');
    expect(productQuery.eq).toHaveBeenCalledWith('status', 'hidden');
    expect(productQuery.or).toHaveBeenCalledWith(
      expect.stringContaining('name.ilike.%KTX%,code.ilike.%KTX%')
    );
    expect(productQuery.or).toHaveBeenCalledWith(expect.stringContaining('id.eq.composition-parent'));
    expect(productQuery.range).toHaveBeenCalledWith(10, 19);
    const filterCallOrders = [
      ...productQuery.eq.mock.invocationCallOrder,
      ...productQuery.not.mock.invocationCallOrder,
      ...productQuery.filter.mock.invocationCallOrder,
      ...productQuery.or.mock.invocationCallOrder,
    ];
    expect(filterCallOrders.every((callOrder) => callOrder < productQuery.range.mock.invocationCallOrder[0])).toBe(true);
  });

  it('exclui artefatos de teste do total antes de paginar a lista', async () => {
    const mockQuery: any = {
      eq: vi.fn().mockReturnThis(),
      not: vi.fn().mockReturnThis(),
      filter: vi.fn().mockReturnThis(),
      or: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      range: vi.fn().mockReturnThis(),
      then: vi.fn((resolve) => resolve({ data: [], count: 0, error: null })),
    };

    await applyProductFiltersAndSort(
      mockQuery,
      { excludeTestProducts: true },
      { orderColumn: 'created_at', ascending: false, from: 0, to: 14 }
    );

    expect(mockQuery.or).toHaveBeenCalledWith(
      expect.stringContaining('technical_specs->testArtifact->>is_test')
    );
    expect(mockQuery.or.mock.invocationCallOrder.at(-1)).toBeLessThan(
      mockQuery.range.mock.invocationCallOrder[0]
    );
  });

  it('não exclui produtos de teste quando a lista pede exibição administrativa', async () => {
    const mockQuery: any = {
      eq: vi.fn().mockReturnThis(),
      not: vi.fn().mockReturnThis(),
      filter: vi.fn().mockReturnThis(),
      or: vi.fn().mockReturnThis(),
      then: vi.fn((resolve) => resolve({ data: [], count: 0, error: null })),
    };

    await applyProductFiltersAndSort(mockQuery, { excludeTestProducts: false });

    expect(mockQuery.or).not.toHaveBeenCalledWith(
      expect.stringContaining('technical_specs->testArtifact')
    );
  });
});
