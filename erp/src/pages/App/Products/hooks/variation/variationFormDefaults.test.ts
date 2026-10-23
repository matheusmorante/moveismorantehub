import { describe, it, expect } from 'vitest';
import {
  computeDefaultVariationName,
  computeDefaultVariationTitle,
  buildInitialVariationFormData,
  calculateEffectivePurchaseCost,
} from './variationFormDefaults';
import type { Product, Variation } from '@/pages/types/product.type';

describe('variationFormDefaults', () => {
  const mockParent: Product = {
    id: 'parent-1',
    name: 'Cadeira Gamer',
    description: 'Cadeira ergonômica',
    unitPrice: 500,
    promoPrice: 400,
    costPrice: 250,
    unit: 'UN',
    code: 'CAD100',
    itemType: 'product',
    active: true,
    status: 'published',
  };

  it('calcula o nome padrão da variação a partir dos atributos', () => {
    const name = computeDefaultVariationName(mockParent, [
      { name: 'Cor', value: 'Vermelha' },
    ]);
    expect(name).toBe('Cadeira Gamer Vermelha');
  });

  it('calcula o título padrão da variação', () => {
    const title = computeDefaultVariationTitle(mockParent, [
      { name: 'Cor', value: 'Preta' },
    ]);
    expect(title).toBe('Cadeira Gamer Preta');
  });

  it('calcula o custo efetivo de compra com ipi e frete fixo', () => {
    // 250 + 10% (25) + 30 frete = 305
    const cost = calculateEffectivePurchaseCost(250, 10, 30, 'fixed');
    expect(cost).toBe(305);
  });

  it('calcula o custo efetivo de compra com ipi e frete percentual', () => {
    // 250 + 10% (25) + 5% (12.5) = 287.5
    const cost = calculateEffectivePurchaseCost(250, 10, 5, 'percentage');
    expect(cost).toBe(287.5);
  });

  it('não adiciona frete quando o tipo selecionado é sem frete', () => {
    expect(calculateEffectivePurchaseCost(250, 10, 30, 'none')).toBe(275);
  });

  it('constrói dados iniciais para nova variação herdando preço do pai', () => {
    const { formData, discountFixed, discountPercent } = buildInitialVariationFormData(
      mockParent,
      null,
      false,
      false,
      []
    );
    expect(formData.unitPrice).toBe(500);
    expect(formData.costPrice).toBe(250);
    expect(formData.syncUnitPrice).toBe(true);
    expect(discountFixed).toBe('');
    expect(discountPercent).toBe('');
  });

  it('constrói dados iniciais a partir de variação existente calculando desconto', () => {
    const existing: Variation = {
      id: 'var-1',
      sku: 'CAD100-01',
      name: 'Cadeira Gamer Vermelha',
      unitPrice: 500,
      promoPrice: 400,
      syncUnitPrice: false,
      active: true,
      status: 'published',
      stock: 5,
      attributes: [],
    };
    const { formData, discountFixed, discountPercent } = buildInitialVariationFormData(
      mockParent,
      existing,
      false,
      false,
      []
    );
    expect(formData.id).toBe('var-1');
    expect(discountFixed).toBe('100.00');
    expect(discountPercent).toBe('20.0');
  });
});
