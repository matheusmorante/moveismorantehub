import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { fetchProductsPage } = vi.hoisted(() => ({ fetchProductsPage: vi.fn() }));

vi.mock('./mobileProductFetchService', () => ({ fetchMobileProductsPage: fetchProductsPage }));

import { searchMobileProductCompositionCandidates } from './mobileProductCompositionService';

describe('searchMobileProductCompositionCandidates', () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(() => vi.useRealTimers());

  it('usa busca e filtros do catálogo, expõe variações operacionais e remove compostos/mesclados', async () => {
    fetchProductsPage.mockResolvedValue({
      total: 6,
      data: [
        {
          id: 'product-1',
          name: 'Mesa Aurora',
          code: 'MESA-1',
          itemType: 'product',
          active: true,
          unitPrice: 120,
          promoPrice: 105,
          stock: 4,
          variations: [
            { id: 'active-var', name: 'Mesa Aurora Azul', sku: 'MESA-1-01', unitPrice: 120, promoPrice: 90, stock: 4, active: true },
            { id: 'inactive-var', name: 'Mesa Aurora Verde', active: false },
            { id: 'merged-var', name: 'Mesa Aurora Branca', active: true, mergedToVariationId: 'target-var' },
          ],
        },
        {
          id: 'legacy-simple',
          name: 'Banqueta simples',
          code: 'BAN-1',
          itemType: 'product',
          active: true,
          unitPrice: 50,
          promoPrice: 45,
          stock: 8,
          variations: [{ id: 'virtual-var', isVirtual: true, name: 'Banqueta simples', unitPrice: 50, stock: 8, active: true }],
        },
        { id: 'composition', name: 'Kit Aurora', itemType: 'composition', active: true, variations: [] },
        { id: 'legacy-combo', name: 'Kit antigo', itemType: 'product', is_combo: true, active: true, variations: [] },
        { id: 'draft', name: 'Rascunho', itemType: 'product', isDraft: true, active: true, variations: [] },
        { id: 'inactive', name: 'Inativo', itemType: 'product', active: false, variations: [] },
      ],
    });

    const candidates = await searchMobileProductCompositionCandidates(
      'Mesa Aurora',
      '123e4567-e89b-42d3-a456-426614174000'
    );
    expect(candidates).toEqual([
        expect.objectContaining({
          id: 'product-1',
          name: 'Mesa Aurora',
          variationId: 'active-var',
          variationName: 'Mesa Aurora Azul',
          variationPrice: 120,
          variationPromoPrice: 90,
          promoPrice: 105,
          variationStock: 4,
        }),
        expect.objectContaining({ id: 'legacy-simple', code: 'BAN-1', stock: 8, price: 50, promoPrice: 45 }),
      ]);
    expect(candidates[1]).not.toHaveProperty('variationId');

    expect(fetchProductsPage).toHaveBeenCalledWith(1, 25, {
      search: 'Mesa Aurora',
      statusFilter: 'active',
      includeMerged: false,
      itemType: 'standard',
      supplierId: '123e4567-e89b-42d3-a456-426614174000',
      throwOnError: true,
    });
  });

  it('não envia uma busca sem fornecedor válido para o catálogo', async () => {
    await expect(searchMobileProductCompositionCandidates('Mesa', 'supplier,or(active.eq.true)'))
      .resolves.toEqual([]);
    expect(fetchProductsPage).not.toHaveBeenCalled();
  });

  it('mantém até 15 sugestões, como o autocomplete ERP', async () => {
    fetchProductsPage.mockResolvedValue({
      total: 20,
      data: Array.from({ length: 20 }, (_, index) => ({
        id: `product-${index + 1}`,
        name: `Produto ${index + 1}`,
        itemType: 'product',
        active: true,
        variations: [],
      })),
    });

    const candidates = await searchMobileProductCompositionCandidates('Produto');

    expect(candidates).toHaveLength(15);
    expect(candidates[0].id).toBe('product-1');
    expect(candidates[14].id).toBe('product-15');
  });

  it('encerra a busca em 10 segundos e permite exibir o estado de erro', async () => {
    vi.useFakeTimers();
    fetchProductsPage.mockReturnValue(new Promise(() => {}));
    const search = searchMobileProductCompositionCandidates('Produto');
    const rejection = expect(search).rejects.toThrow(
      'A busca de componentes expirou. Tente novamente.'
    );

    await vi.advanceTimersByTimeAsync(10_000);

    await rejection;
  });
});
