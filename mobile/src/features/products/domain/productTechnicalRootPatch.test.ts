import { describe, expect, it } from 'vitest';
import {
  getProductTechnicalRootFallbackValue,
  getProductTechnicalRootPatch,
} from '../../../../../shared-utils/productTechnicalRootPatch';

describe('getProductTechnicalRootFallbackValue', () => {
  it('projeta o peso salvo na propriedade raiz para a característica Peso', () => {
    expect(getProductTechnicalRootFallbackValue(' Peso ', { weight: 2.5 })).toBe(2.5);
  });

  it('não oferece fallback para outra característica nem para peso zero', () => {
    expect(getProductTechnicalRootFallbackValue('Material', { weight: 2.5 })).toBeUndefined();
    expect(getProductTechnicalRootFallbackValue('Peso', { weight: 0 })).toBeUndefined();
  });
});

describe('getProductTechnicalRootPatch', () => {
  it('sincroniza Marca para o campo raiz do produto', () => {
    expect(getProductTechnicalRootPatch('Marca', 'Morante')).toEqual({ brand: 'Morante' });
  });

  it('limpa o campo raiz quando Marca é apagada e aceita variação de caixa/espaços', () => {
    expect(getProductTechnicalRootPatch(' marca ', null)).toEqual({ brand: '' });
  });

  it('não altera o produto raiz para outras características', () => {
    expect(getProductTechnicalRootPatch('Material', 'MDF')).toEqual({});
  });
});
