import { describe, it, expect, vi, beforeEach } from 'vitest';
import { deleteCategory, deleteEnvironment, fetchCategoryProductCounts } from '../categoryService';
import { ecommerceSupabase as supabase } from '../supabaseConfig';

vi.mock('../supabaseConfig', () => {
  return {
    ecommerceSupabase: {
      from: vi.fn(),
    },
    supabase: {
      from: vi.fn(),
    },
  };
});

describe('Regras de Exclusão Segura — Backend / Service (categoryService)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('Cenário 9: Deve recusar a exclusão de categoria quando existirem produtos vinculados', async () => {
    const catId = 'cat-com-produtos-123';

    // Mock de verificação: product_categories retorna count = 3
    const mockProductCategoriesQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockImplementation((col, val) => {
        return Promise.resolve({
          count: 3,
          data: [{ product_id: 'p1' }, { product_id: 'p2' }, { product_id: 'p3' }],
        });
      }),
    };

    const mockProductsQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockImplementation(() => Promise.resolve({ count: 0, data: [] })),
    };

    (supabase.from as any).mockImplementation((table: string) => {
      if (table === 'product_categories') return mockProductCategoriesQuery;
      if (table === 'products') return mockProductsQuery;
      return {
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null }),
      };
    });

    await expect(deleteCategory(catId)).rejects.toThrow(
      /Não é possível excluir esta categoria porque ela está sendo utilizada por \d+ produto/
    );
  });

  it('propaga falha de consulta da contagem em vez de apresentar total zero', async () => {
    const queryError = new Error('Falha ao consultar product_categories');
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    (supabase.from as any).mockImplementation((table: string) => {
      if (table === 'product_categories') {
        return { select: vi.fn().mockResolvedValue({ data: null, error: queryError }) };
      }
      return {
        select: vi.fn().mockReturnValue({
          not: vi.fn().mockResolvedValue({ data: [], error: null }),
        }),
      };
    });

    await expect(fetchCategoryProductCounts()).rejects.toBe(queryError);
  });

  it('informa produtos distintos quando uma categoria aparece nas duas fontes', async () => {
    const catId = 'cat-product-distinct-count';
    const makeQuery = (count: number, rows: unknown[]) => ({
      select: vi.fn().mockImplementation((_columns: string, options?: { head?: boolean }) => ({
        eq: vi.fn().mockResolvedValue(
          options?.head ? { count, error: null } : { data: rows, error: null }
        ),
      })),
    });
    const productCategoriesQuery = makeQuery(2, [
      { product_id: 'product-1' },
      { product_id: 'product-2' },
    ]);
    const productsQuery = makeQuery(1, [{ id: 'product-2' }]);
    (supabase.from as any).mockImplementation((table: string) => {
      if (table === 'product_categories') return productCategoriesQuery;
      if (table === 'products') return productsQuery;
      return { delete: vi.fn().mockReturnThis(), eq: vi.fn().mockResolvedValue({ error: null }) };
    });

    await expect(deleteCategory(catId)).rejects.toThrow(
      /Não é possível excluir esta categoria porque ela está sendo utilizada por 2 produtos/
    );
  });

  it('falha fechado se não consegue verificar os vínculos antes de excluir', async () => {
    const catId = 'cat-link-check-error';
    const checkError = new Error('Falha ao consultar vínculo de Produto');
    const deleteCategoryEq = vi.fn().mockResolvedValue({ error: null });
    (supabase.from as any).mockImplementation((table: string) => {
      if (table === 'product_categories') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockResolvedValue({ count: null, data: null, error: checkError }),
        };
      }
      if (table === 'products') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockResolvedValue({ count: 0, data: [], error: null }),
        };
      }
      return { delete: vi.fn().mockReturnValue({ eq: deleteCategoryEq }) };
    });

    await expect(deleteCategory(catId)).rejects.toBe(checkError);
    expect(supabase.from).not.toHaveBeenCalledWith('category_relationships');
    expect(supabase.from).not.toHaveBeenCalledWith('categories');
    expect(deleteCategoryEq).not.toHaveBeenCalled();
  });

  it('falha fechado se não consegue ler os IDs distintos após uma contagem positiva', async () => {
    const catId = 'cat-detail-check-error';
    const detailError = new Error('Falha ao listar produtos vinculados');
    const makeQuery = (
      headCount: number,
      rows: unknown[],
      detailQueryError: Error | null = null
    ) => ({
      select: vi.fn().mockImplementation((_columns: string, options?: { head?: boolean }) => ({
        eq: vi.fn().mockResolvedValue(
          options?.head
            ? { count: headCount, error: null }
            : { data: detailQueryError ? null : rows, error: detailQueryError }
        ),
      })),
    });
    (supabase.from as any).mockImplementation((table: string) => {
      if (table === 'product_categories') return makeQuery(1, [], detailError);
      if (table === 'products') return makeQuery(0, []);
      return { delete: vi.fn().mockReturnThis(), eq: vi.fn().mockResolvedValue({ error: null }) };
    });

    await expect(deleteCategory(catId)).rejects.toBe(detailError);
    expect(supabase.from).not.toHaveBeenCalledWith('category_relationships');
    expect(supabase.from).not.toHaveBeenCalledWith('categories');
  });

  it('Cenário 4: Deve permitir a exclusão de categoria sem produtos vinculados e remover seus relacionamentos com ambientes', async () => {
    const catId = 'cat-livre-sem-produtos-456';

    const mockProductCategoriesQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ count: 0, data: [] }),
    };

    const mockProductsQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ count: 0, data: [] }),
    };

    const deleteRelMock = vi.fn().mockReturnThis();
    const eqRelMock = vi.fn().mockResolvedValue({ error: null });
    deleteRelMock.eq = eqRelMock;

    const deleteCatMock = vi.fn().mockReturnThis();
    const eqCatMock = vi.fn().mockResolvedValue({ error: null });
    deleteCatMock.eq = eqCatMock;

    (supabase.from as any).mockImplementation((table: string) => {
      if (table === 'product_categories') return mockProductCategoriesQuery;
      if (table === 'products') return mockProductsQuery;
      if (table === 'category_relationships') {
        return {
          delete: () => ({ eq: eqRelMock }),
        };
      }
      if (table === 'categories') {
        return {
          delete: () => ({ eq: eqCatMock }),
        };
      }
      return {};
    });

    await expect(deleteCategory(catId)).resolves.not.toThrow();
    expect(eqRelMock).toHaveBeenCalledWith('child_id', catId);
    expect(eqCatMock).toHaveBeenCalledWith('id', catId);
  });

  it('Cenário 5: Deve recusar a exclusão de ambiente quando houver categorias vinculadas', async () => {
    const envId = 'env-com-categorias-789';

    const mockRelsQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ count: 4, error: null }),
    };

    (supabase.from as any).mockImplementation((table: string) => {
      if (table === 'category_relationships') return mockRelsQuery;
      return {};
    });

    await expect(deleteEnvironment(envId)).rejects.toThrow(
      /Não é possível excluir este ambiente porque ele possui 4 categorias vinculadas/
    );
  });

  it('Cenário 7: Deve permitir a exclusão de ambiente quando não houver categorias vinculadas', async () => {
    const envId = 'env-vazio-000';

    const mockRelsQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ count: 0, error: null }),
    };

    const eqEnvMock = vi.fn().mockResolvedValue({ error: null });

    (supabase.from as any).mockImplementation((table: string) => {
      if (table === 'category_relationships') return mockRelsQuery;
      if (table === 'categories') {
        return {
          delete: () => ({ eq: eqEnvMock }),
        };
      }
      return {};
    });

    await expect(deleteEnvironment(envId)).resolves.not.toThrow();
    expect(eqEnvMock).toHaveBeenCalledWith('id', envId);
  });
});
