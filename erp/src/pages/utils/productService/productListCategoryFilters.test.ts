import { describe, expect, it, vi } from 'vitest';
import {
  buildProductListCategoryFilter,
  fetchProductListCategoryFilter,
} from '../../../../../shared-utils/productListCategoryFilters';

describe('buildProductListCategoryFilter', () => {
  it('combina categoria primária, nome legado e relações normalizadas sem IDs repetidos', () => {
    expect(
      buildProductListCategoryFilter('category-1', 'Sala, Jantar', [
        'product-1',
        'product-1',
        'product-2',
      ])
    ).toBe('category_id.eq.category-1,category.eq."Sala, Jantar",id.in.(product-1,product-2)');
  });

  it('usa apenas a categoria primária quando não há fallback legado nem relações', () => {
    expect(buildProductListCategoryFilter('category-1', '  ', [])).toBe(
      'category_id.eq.category-1'
    );
  });

  it('preserva caracteres reservados nos nomes legados escapando aspas e barras', () => {
    const categoryName = 'Sala "Premium" \\ Outlet, kit (linha A)';

    expect(buildProductListCategoryFilter('category-1', categoryName)).toBe(
      String.raw`category_id.eq.category-1,category.eq."Sala \"Premium\" \\ Outlet, kit (linha A)"`
    );
  });

  it('busca nome e produtos vinculados em paralelo para criar o predicado da categoria', async () => {
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
    const client = {
      from: vi.fn((table: string) => (table === 'categories' ? categoryQuery : categoryLinksQuery)),
    };

    await expect(fetchProductListCategoryFilter(client, 'category-1')).resolves.toBe(
      'category_id.eq.category-1,category.eq."Sala",id.in.(product-1,product-2)'
    );
    expect(client.from).toHaveBeenNthCalledWith(1, 'categories');
    expect(client.from).toHaveBeenNthCalledWith(2, 'product_categories');
  });

  it('propaga erros das consultas auxiliares em vez de aplicar um filtro parcial', async () => {
    const lookupError = new Error('Falha ao carregar categoria');
    const categoryQuery: any = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: lookupError }),
    };
    const categoryLinksQuery: any = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      then: vi.fn((resolve) => resolve({ data: [], error: null })),
    };
    const client = {
      from: vi.fn((table: string) => (table === 'categories' ? categoryQuery : categoryLinksQuery)),
    };

    await expect(fetchProductListCategoryFilter(client, 'category-1')).rejects.toBe(lookupError);
  });
});
