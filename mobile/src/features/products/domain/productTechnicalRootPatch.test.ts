import { describe, expect, it } from 'vitest';
import { getProductTechnicalRootPatch } from '../../../../../shared-utils/productTechnicalRootPatch';

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
