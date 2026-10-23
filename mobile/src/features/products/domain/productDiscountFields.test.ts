import { describe, expect, it } from 'vitest';
import {
  calculateProductDiscountFromFixed,
  calculateProductDiscountFromPercent,
  calculateProductDiscountFromPromoPrice,
  deriveProductDiscountFields,
  getProductDiscountValidationIssues,
} from '../../../../../shared-utils/productDiscountFields';

describe('calculateProductDiscountFromPercent', () => {
  it('calcula desconto fixo e promoção para percentual positivo', () => {
    expect(calculateProductDiscountFromPercent(100, 20)).toEqual({
      discountFixed: '20.00',
      promoPrice: 80,
    });
  });

  it('trata percentual zero, inválido ou negativo como ausência de promoção', () => {
    expect(calculateProductDiscountFromPercent(100, 0)).toEqual({
      discountFixed: '',
      promoPrice: undefined,
    });
    expect(calculateProductDiscountFromPercent(100, Number.NaN)).toEqual({
      discountFixed: '',
      promoPrice: undefined,
    });
    expect(calculateProductDiscountFromPercent(100, -5)).toEqual({
      discountFixed: '',
      promoPrice: undefined,
    });
  });

  it('não cria promoção acima de 100 por cento', () => {
    expect(calculateProductDiscountFromPercent(100, 150)).toEqual({
      discountFixed: '150.00',
      promoPrice: undefined,
    });
  });
});

describe('calculateProductDiscountFromFixed', () => {
  it('calcula percentual e promoção a partir de um valor fixo', () => {
    expect(calculateProductDiscountFromFixed(100, 12.5)).toEqual({
      discountPercent: '12.5',
      promoPrice: 87.5,
    });
  });

  it('limpa a promoção para valor fixo vazio ou zero', () => {
    expect(calculateProductDiscountFromFixed(100, 0)).toEqual({
      discountPercent: '',
      promoPrice: undefined,
    });
  });

  it('não cria promoção para desconto fixo negativo ou maior que o preço', () => {
    expect(calculateProductDiscountFromFixed(100, -5)).toEqual({
      discountPercent: '',
      promoPrice: undefined,
    });
    expect(calculateProductDiscountFromFixed(100, 150)).toEqual({
      discountPercent: '150.0',
      promoPrice: undefined,
    });
  });
});

describe('calculateProductDiscountFromPromoPrice', () => {
  it('deriva campos apenas quando o promocional fica abaixo do preço de venda', () => {
    expect(calculateProductDiscountFromPromoPrice(100, 100)).toEqual({
      discountFixed: '',
      discountPercent: '',
      promoPrice: 100,
    });
    expect(calculateProductDiscountFromPromoPrice(100, 120)).toEqual({
      discountFixed: '',
      discountPercent: '',
      promoPrice: 120,
    });
  });

  it('normaliza promoção zero para ausência de valor promocional', () => {
    expect(calculateProductDiscountFromPromoPrice(100, 0)).toEqual({
      discountFixed: '',
      discountPercent: '',
      promoPrice: undefined,
    });
  });
});

describe('deriveProductDiscountFields', () => {
  it('deriva desconto em reais e percentual para preço promocional menor', () => {
    expect(deriveProductDiscountFields(100, 79.99)).toEqual({
      discountFixed: '20.01',
      discountPercent: '20.0',
    });
  });

  it.each([
    [0, 50],
    [100, 0],
    [100, 100],
    [100, 120],
  ])('limpa os descontos quando preço %s e promoção %s não formam desconto', (unitPrice, promoPrice) => {
    expect(deriveProductDiscountFields(unitPrice, promoPrice)).toEqual({
      discountFixed: '',
      discountPercent: '',
    });
  });
});

describe('getProductDiscountValidationIssues', () => {
  it('aceita descontos dentro dos limites, incluindo percentual decimal localizado', () => {
    expect(getProductDiscountValidationIssues('5,5', 'R$ 1.234,50', 1500)).toEqual([]);
  });

  it.each([
    ['discountPercent', '-1', 'Informe um desconto percentual entre zero e 100.'],
    ['discountPercent', '101', 'Informe um desconto percentual entre zero e 100.'],
    ['discountPercent', 'inválido', 'Informe um desconto percentual entre zero e 100.'],
    ['discountFixed', '-1', 'O desconto em reais deve ficar entre zero e o preço de venda.'],
    ['discountFixed', '101', 'O desconto em reais deve ficar entre zero e o preço de venda.'],
    ['discountFixed', 'inválido', 'O desconto em reais deve ficar entre zero e o preço de venda.'],
  ] as const)('rejeita %s fora do intervalo', (field, value, message) => {
    const issues = getProductDiscountValidationIssues(
      field === 'discountPercent' ? value : '',
      field === 'discountFixed' ? value : '',
      100
    );
    expect(issues).toEqual([{ field, message }]);
  });
});
