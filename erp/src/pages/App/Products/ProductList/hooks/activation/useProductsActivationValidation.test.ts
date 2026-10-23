import { describe, expect, it } from 'vitest';
import type Product from '@/pages/types/product.type';
import { isNonConventionalProduct } from '../../../../../../../../shared-utils/productActivationValidation';
import { validateErpActivationRequirements } from './useProductsActivationValidation';

const validComposition = (productKind?: Product['productKind']): Product => ({
  id: 'composition-1',
  name: 'Composição teste',
  description: '',
  categoryIds: ['category-1'],
  unitPrice: 100,
  unit: 'UN',
  active: false,
  isDraft: false,
  itemType: 'composition',
  mainSupplierId: 'supplier-1',
  comboItems: [
    { productId: 'part-1', quantity: 1, description: 'Parte 1', unitPrice: 50, stock: 1 },
    { productId: 'part-2', quantity: 1, description: 'Parte 2', unitPrice: 50, stock: 1 },
  ],
  ...(productKind ? { productKind } : {}),
});

describe('validação da ativação ERP por tipo do produto', () => {
  it.each([
    [{ productKind: 'usados' }, true],
    [{ stock_origin: 'usados' }, true],
    [{ productKind: 'normal' }, false],
  ])('classifica corretamente produtos não convencionais: %o', (product, expected) => {
    expect(isNonConventionalProduct(product)).toBe(expected);
  });

  it('bloqueia a ativação de uma composição Salvado', () => {
    const salvado = validComposition('salvado');

    expect(validateErpActivationRequirements(salvado.id!, [salvado], [salvado])).toMatchObject({
      isValid: false,
      errorMessage:
        'Produtos de origem de estoque Salvados não podem ser ativados no ERP, apenas no catálogo digital.',
    });
  });

  it('bloqueia uma variação quando o produto pai é Salvado', () => {
    const salvado = {
      ...validComposition('salvado'),
      variations: [
        {
          id: 'variation-1',
          sku: 'COMP-01',
          name: 'Variação',
          stock: 1,
          unitPrice: 100,
          active: false,
          attributes: [],
        },
      ],
    };

    expect(validateErpActivationRequirements('variation-1', [salvado], [salvado])).toMatchObject({
      isValid: false,
      errorMessage:
        'Produtos de origem de estoque Salvados não podem ser ativados no ERP, apenas no catálogo digital.',
    });
  });

  it('trata composição antiga sem productKind como Normal e permite validar ativação', () => {
    const legacyComposition = validComposition();

    expect(
      validateErpActivationRequirements(
        legacyComposition.id!,
        [legacyComposition],
        [legacyComposition]
      )
    ).toEqual({ isValid: true });
  });

  it('exige dois componentes na composição simples antes da ativação', () => {
    const composition = {
      ...validComposition(),
      comboItems: [{ productId: 'part-1', quantity: 1, description: 'Parte 1', unitPrice: 50, stock: 1 }],
    };

    expect(
      validateErpActivationRequirements(composition.id!, [composition], [composition])
    ).toMatchObject({ isValid: false, errorMessage: expect.stringContaining('pelo menos 2 produtos componentes') });
  });

  it('exige os componentes específicos da variação composta', () => {
    const composition = {
      ...validComposition(),
      sku: 'COMP-01',
      variations: [
        {
          id: 'variation-1',
          sku: 'COMP-01-01',
          name: 'Variação',
          stock: 1,
          unitPrice: 100,
          syncUnitPrice: true,
          active: false,
          attributes: [],
          comboItems: [
            { productId: 'part-1', quantity: 1, description: 'Parte 1', unitPrice: 50, stock: 1 },
          ],
        },
      ],
    };

    expect(
      validateErpActivationRequirements(
        `${composition.id}_${composition.variations[0].sku}`,
        [composition],
        [composition]
      )
    ).toMatchObject({ isValid: false, errorMessage: expect.stringContaining('pelo menos 2 produtos componentes') });
  });

  it('mantém a validação do pai separado da validação individual das variações', () => {
    const composition = {
      ...validComposition(),
      variations: [
        {
          id: 'variation-1',
          sku: 'COMP-01-01',
          name: 'Variação',
          stock: 1,
          unitPrice: 100,
          syncUnitPrice: true,
          active: false,
          attributes: [],
          comboItems: [
            { productId: 'part-1', quantity: 1, description: 'Parte 1', unitPrice: 50, stock: 1 },
          ],
        },
      ],
    };

    expect(
      validateErpActivationRequirements(composition.id!, [composition], [composition])
    ).toEqual({ isValid: true });
  });

  it('exige preço em produto simples sem variações', () => {
    const simpleProduct: Product = {
      id: 'simple-1',
      name: 'Produto simples',
      description: 'Produto simples',
      categoryIds: ['category-1'],
      unitPrice: 0,
      unit: 'UN',
      active: false,
      itemType: 'product',
      mainSupplierId: 'supplier-1',
    };

    expect(
      validateErpActivationRequirements(simpleProduct.id!, [simpleProduct], [simpleProduct])
    ).toMatchObject({ isValid: false, errorMessage: expect.stringContaining('preço de venda') });
  });

  it('exige preço no produto simples que tem a variação padrão operacional', () => {
    const simpleProduct: Product = {
      id: 'simple-with-default-variation',
      name: 'Produto simples',
      description: 'Produto simples',
      categoryIds: ['category-1'],
      unitPrice: 0,
      unit: 'UN',
      active: false,
      isDraft: false,
      hasVariations: false,
      itemType: 'product',
      mainSupplierId: 'supplier-1',
      variations: [
        {
          id: 'variation-uuid',
          sku: 'SIMPLE-01',
          name: 'Produto simples',
          stock: 0,
          unitPrice: 0,
          syncUnitPrice: true,
          active: false,
          attributes: [],
        },
      ],
    };

    expect(
      validateErpActivationRequirements(simpleProduct.id!, [simpleProduct], [simpleProduct])
    ).toMatchObject({ isValid: false, errorMessage: expect.stringContaining('preço de venda') });
  });

  it('valida variação pelo UUID e exige preço do pai quando herda o preço', () => {
    const variationId = '123e4567-e89b-42d3-a456-426614174001';
    const product: Product = {
      ...validComposition(),
      itemType: 'product',
      hasVariations: false,
      unitPrice: 0,
      variations: [
        {
          id: variationId,
          sku: 'PROD-01',
          name: 'Produto teste',
          stock: 0,
          unitPrice: 0,
          syncUnitPrice: true,
          active: false,
          attributes: [],
        },
      ],
    };

    expect(
      validateErpActivationRequirements(
        variationId,
        [product],
        [product]
      )
    ).toMatchObject({ isValid: false, errorMessage: expect.stringContaining('preço de venda') });
  });

  it('permite ativar variação UUID com requisitos atendidos e nome somente no campo nome', () => {
    const variationId = '123e4567-e89b-42d3-a456-426614174001';
    const product: Product = {
      id: 'parent-product',
      name: 'Produto pai',
      description: '',
      categoryIds: ['category-1'],
      unitPrice: 100,
      mainSupplierId: 'supplier-1',
      isDraft: false,
      hasVariations: false,
      itemType: 'product',
      unit: 'UN',
      active: false,
      variations: [
        {
          id: variationId,
          sku: 'PROD-01',
          name: 'Produto Azul',
          stock: 0,
          unitPrice: 100,
          syncUnitPrice: true,
          active: false,
          attributes: [],
        },
      ],
    };

    expect(
      validateErpActivationRequirements(
        variationId,
        [product],
        [product]
      )
    ).toEqual({ isValid: true });
  });

  it('não usa o preço do pai quando a variação tem preço próprio zerado', () => {
    const variationId = '123e4567-e89b-42d3-a456-426614174001';
    const product: Product = {
      ...validComposition(),
      itemType: 'product',
      hasVariations: true,
      variations: [
        {
          id: variationId,
          sku: 'PROD-01',
          name: 'Produto Azul',
          stock: 0,
          unitPrice: 0,
          syncUnitPrice: false,
          active: false,
          attributes: [],
        },
      ],
    };

    expect(
      validateErpActivationRequirements(
        variationId,
        [product],
        [product]
      )
    ).toMatchObject({ isValid: false, errorMessage: expect.stringContaining('preço de venda') });
  });

  it('bloqueia ativação de variação por UUID quando o produto pai é rascunho', () => {
    const variationId = '123e4567-e89b-42d3-a456-426614174001';
    const draft: Product = {
      ...validComposition(),
      isDraft: true,
      variations: [
        {
          id: variationId,
          sku: 'PROD-01',
          name: 'Produto',
          stock: 0,
          unitPrice: 100,
          syncUnitPrice: true,
          active: false,
          attributes: [],
        },
      ],
    };

    expect(
      validateErpActivationRequirements(
        variationId,
        [draft],
        [draft]
      )
    ).toMatchObject({ isValid: false, errorMessage: expect.stringContaining('rascunho') });
  });
});
