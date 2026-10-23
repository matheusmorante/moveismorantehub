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

  it('busca na lixeira itens desativados ou excluídos e omite rascunhos', async () => {
    const mockQuery: any = {
      eq: vi.fn().mockReturnThis(),
      not: vi.fn().mockReturnThis(),
      filter: vi.fn().mockReturnThis(),
      or: vi.fn().mockReturnThis(),
      then: vi.fn((resolve) => resolve({ data: [], error: null })),
    };

    await applyProductFiltersAndSort(mockQuery, { showTrash: true });

    expect(mockQuery.eq).not.toHaveBeenCalledWith('deleted', false);
    expect(mockQuery.or).toHaveBeenCalledWith('active.eq.false,deleted.eq.true');
    expect(mockQuery.not).toHaveBeenCalledWith('is_draft', 'is', true);
    expect(mockQuery.filter).toHaveBeenCalledWith('status', 'isdistinct', 'draft');
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
