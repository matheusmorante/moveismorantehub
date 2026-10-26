import { describe, expect, it } from 'vitest';
import {
  getMobileCompositionEmptyHint,
  getMobileProductListCategoryIds,
  getMobileProductListCategoryLabel,
  shouldShowMobileProductPagination,
} from './mobileProductListPresentation';

describe('shouldShowMobileProductPagination', () => {
  it.each([
    ['vazio ou sem resultados', 0, false, false, false],
    ['erro sem snapshot de linhas', 0, false, false, false],
    ['consulta inicial', 0, true, false, false],
    ['resultado carregado', 1, false, false, true],
    ['refresh com linhas preservadas', 1, false, true, true],
    ['refresh sem linhas', 0, false, true, false],
    ['nova consulta enquanto os resultados antigos estão em memória', 1, true, false, false],
  ])('%s: decide a visibilidade do rodapé', (_, productCount, loading, refreshing, expected) => {
    expect(shouldShowMobileProductPagination(productCount, loading, refreshing)).toBe(expected);
  });
});

describe('getMobileCompositionEmptyHint', () => {
  it('sugere criar composição para perfis autorizados', () => {
    expect(getMobileCompositionEmptyHint(true)).toBe(
      'Tente ajustar seus filtros ou adicione uma nova composição.'
    );
  });

  it('não sugere criação para perfis sem productConfig', () => {
    expect(getMobileCompositionEmptyHint(false)).toBe(
      'Tente ajustar seus filtros para encontrar uma composição.'
    );
  });
});

describe('mobile product-list category presentation', () => {
  it('uses normalized category relations before the legacy category_id fallback', () => {
    expect(
      getMobileProductListCategoryIds({
        category_id: 'legacy-category',
        product_categories: [{ category_id: 'linked-category' }],
      })
    ).toEqual(['linked-category']);
    expect(
      getMobileProductListCategoryIds({
        category_id: 'legacy-category',
        product_categories: [],
      })
    ).toEqual(['legacy-category']);
    expect(
      getMobileProductListCategoryIds({
        category_id: 'legacy-category',
        product_categories: [{}],
      })
    ).toEqual([]);
  });

  it('resolves the legacy category ID name and preserves text fallback', () => {
    const categories = new Map([['legacy-category', 'Quarto']]);
    expect(
      getMobileProductListCategoryLabel(
        { category_id: 'legacy-category', product_categories: [] },
        categories
      )
    ).toBe('Quarto');
    expect(
      getMobileProductListCategoryLabel(
        { category: 'Categoria legada', product_categories: [] },
        new Map()
      )
    ).toBe('Categoria legada');
  });
});
