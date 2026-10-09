import { describe, expect, it } from 'vitest';
import { prepareMobileProductSaveState } from './productSaveState';

describe('productSaveState', () => {
  it('salva rascunho existente desativado e preserva status próprios das variações', () => {
    const state = prepareMobileProductSaveState(
      { id: 'product-1', status: 'draft' },
      {
        isDraft: true,
        active: false,
        variations: [
          { id: 'v1', active: true, status: 'draft' },
          { id: 'v2', active: true, status: 'hidden' },
          { id: 'v3', active: true },
        ],
      },
      true
    );

    expect(state).toMatchObject({ isDraft: true, active: false, status: 'draft' });
    expect(state.variations).toEqual([
      { id: 'v1', active: false, status: 'draft' },
      { id: 'v2', active: false, status: 'hidden' },
      { id: 'v3', active: false, status: 'draft' },
    ]);
  });

  it('conclui rascunho existente ativando pai e variações em status oculto', () => {
    const state = prepareMobileProductSaveState(
      { id: 'product-1', status: 'draft', is_draft: true },
      {
        isDraft: true,
        active: false,
        variations: [{ id: 'v1', active: false, status: 'draft' }],
      },
      false
    );

    expect(state).toMatchObject({ isDraft: false, active: true, status: 'hidden' });
    expect(state.variations).toEqual([{ id: 'v1', active: true, status: 'hidden' }]);
  });

  it('desativa salvados mesmo se o cadastro anterior estava ativo', () => {
    const state = prepareMobileProductSaveState(
      { id: 'product-1', status: 'hidden' },
      { productKind: 'salvado', active: true, variations: [{ id: 'v1', active: true }] },
      false
    );

    expect(state.active).toBe(false);
    expect(state.variations[0].active).toBe(false);
  });

  it('desativa usados como regra de produto de origem não convencional do ERP', () => {
    const state = prepareMobileProductSaveState(
      { id: 'product-1', status: 'hidden' },
      { productKind: 'usado', active: true, variations: [{ id: 'v1', active: true }] },
      false
    );

    expect(state.active).toBe(false);
    expect(state.variations[0].active).toBe(false);
  });

  it('preserva publicação apenas quando os requisitos de catálogo continuam atendidos', () => {
    const data = {
      title: 'Mesa',
      ecommerceDescription: 'Mesa de madeira.',
      categoryIds: ['categoria'],
      images: ['mesa.jpg'],
      unitPrice: 100,
      width: 80,
      height: 75,
      depth: 60,
      variations: [{ id: 'v1', status: 'draft' }],
      hasVariations: true,
    };
    const state = prepareMobileProductSaveState(
      { id: 'product-1', status: 'published' },
      data,
      false
    );

    expect(state.status).toBe('published');
    expect(state.variations[0].status).toBe('hidden');
    expect(
      prepareMobileProductSaveState(
        { id: 'product-1', status: 'published' },
        { ...data, images: [] },
        false
      ).status
    ).toBe('hidden');
  });

  it('impede publicação de produtos marcados como teste fiscal no catálogo', () => {
    const data = {
      title: 'Mesa Teste',
      code: 'TEST_AUT_999',
      ecommerceDescription: 'Mesa de madeira para testes.',
      categoryIds: ['categoria'],
      images: ['mesa.jpg'],
      unitPrice: 100,
      width: 80,
      height: 75,
      depth: 60,
      variations: [{ id: 'v1', status: 'published' }],
      hasVariations: true,
    };
    const state = prepareMobileProductSaveState(
      { id: 'product-1', status: 'published' },
      data,
      false
    );

    expect(state.status).toBe('hidden');
    expect(state.variations[0].status).toBe('hidden');
  });

  it('impede publicação quando observações contêm HMLNFTEST', () => {
    const data = {
      title: 'Mesa Fiscal',
      observations: 'Produto HMLNFTEST para homologação',
      ecommerceDescription: 'Mesa de madeira para testes.',
      categoryIds: ['categoria'],
      images: ['mesa.jpg'],
      unitPrice: 100,
      width: 80,
      height: 75,
      depth: 60,
      variations: [{ id: 'v1', status: 'published' }],
      hasVariations: true,
    };
    const state = prepareMobileProductSaveState(
      { id: 'product-1', status: 'published' },
      data,
      false
    );

    expect(state.status).toBe('hidden');
  });
});

