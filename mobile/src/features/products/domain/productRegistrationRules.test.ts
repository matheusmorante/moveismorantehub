import { describe, expect, it } from 'vitest';
import {
  getMobileEffectiveVariationPrice,
  getMobileVariationRegistrationIssue,
  isMobileEcommerceLegible,
} from './productRegistrationRules';

const parent = {
  name: 'Armário',
  description: 'Armário de madeira',
  unitPrice: '1.250,00',
  categoryIds: ['categoria'],
  mainSupplierId: 'fornecedor',
  width: 80,
  height: 180,
  depth: 50,
  technicalValues: { Cor: 'Azul', 'Material da estrutura': 'Madeira' },
};

const variation = {
  id: 'variation-1',
  name: 'Armário Azul',
  sku: 'ARM-01',
  syncUnitPrice: true,
  syncPromoPrice: true,
  syncWidth: true,
  syncHeight: true,
  syncDepth: true,
  attributes: [{ name: 'Cor', value: 'Azul', showName: false }],
};

describe('productRegistrationRules', () => {
  it('aceita uma variação completa e resolve preço e dimensões herdados', () => {
    expect(getMobileEffectiveVariationPrice(parent, variation)).toBe(1250);
    expect(getMobileVariationRegistrationIssue(parent, variation, [variation])).toBeNull();
  });

  it('bloqueia uma variação sem preço próprio mesmo quando outra está válida', () => {
    const second = {
      ...variation,
      id: 'variation-2',
      sku: 'ARM-02',
      attributes: [{ name: 'Cor', value: 'Verde' }],
      syncUnitPrice: false,
      price: 0,
    };

    expect(getMobileVariationRegistrationIssue(parent, second, [variation, second])).toMatchObject({
      message: 'Preço de Venda deve ser maior que zero.',
      tab: 'estoque',
    });
  });

  it('detecta combinações de características duplicadas sem considerar showName', () => {
    const duplicate = {
      ...variation,
      id: 'variation-2',
      sku: 'ARM-02',
      attributes: [{ name: ' cor ', value: ' azul ' }],
    };

    expect(
      getMobileVariationRegistrationIssue(parent, duplicate, [variation, duplicate])
    ).toMatchObject({
      message: 'Já existe outra variação com a mesma combinação de atributos e valores.',
    });
  });

  it('detecta SKU repetido sem diferenciar maiúsculas e espaços externos', () => {
    const duplicate = {
      ...variation,
      id: 'variation-2',
      sku: ' arm-01 ',
      attributes: [{ name: 'Cor', value: 'Verde' }],
    };

    expect(
      getMobileVariationRegistrationIssue(parent, duplicate, [variation, duplicate])
    ).toMatchObject({
      message: 'O SKU " arm-01 " já está em uso em outra variação.',
    });
  });

  it('resolve dimensões técnicas e bloqueia uma dimensão ausente', () => {
    const withTechnicalDimensions = {
      ...parent,
      width: 0,
      height: 0,
      depth: 0,
      technicalValues: {
        Cor: 'Azul',
        'Material da estrutura': 'Madeira',
        Largura: '80',
        Altura: '180',
        Profundidade: '50',
      },
    };
    expect(
      getMobileVariationRegistrationIssue(withTechnicalDimensions, variation, [variation])
    ).toBeNull();
    expect(
      getMobileVariationRegistrationIssue(
        {
          ...withTechnicalDimensions,
          height: '',
          technicalValues: {
            ...withTechnicalDimensions.technicalValues,
            Altura: '',
          },
        },
        variation,
        [variation]
      )
    ).toMatchObject({ tab: 'tecnico' });
  });

  it('bloqueia preço promocional igual ou acima do preço efetivo', () => {
    const promoParent = { ...parent, promoPrice: '1.250,00' };
    expect(getMobileVariationRegistrationIssue(promoParent, variation, [variation])).toMatchObject({
      tab: 'estoque',
      message: 'O preço promocional deve ser menor que o preço de venda.',
    });
  });

  it('mantém publicados apenas produtos que continuam legíveis para o catálogo', () => {
    const catalogProduct = {
      ...parent,
      title: 'Armário',
      ecommerceDescription: 'Armário com estrutura de madeira.',
      images: ['https://example.test/armario.jpg'],
      variations: [variation],
      hasVariations: true,
    };
    expect(isMobileEcommerceLegible(catalogProduct)).toBe(true);
    expect(isMobileEcommerceLegible({ ...catalogProduct, images: [] })).toBe(false);
  });
});
