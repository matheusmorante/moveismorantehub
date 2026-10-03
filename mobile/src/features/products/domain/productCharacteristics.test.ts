import { describe, expect, it } from 'vitest';
import {
  getEffectiveVariationTechnicalValues,
  getMissingRequiredCharacteristics,
  isRequiredCharacteristicName,
} from './productCharacteristics';

describe('productCharacteristics', () => {
  it('exige Cor e Material da estrutura como características obrigatórias', () => {
    expect(isRequiredCharacteristicName('cor')).toBe(true);
    expect(isRequiredCharacteristicName('Material da Estrutura')).toBe(true);
    expect(getMissingRequiredCharacteristics({ Cor: 'Azul' })).toEqual(['Material da estrutura']);
  });

  it('considera variação própria e herança do produto pai com precedência da variação', () => {
    const effectiveValues = getEffectiveVariationTechnicalValues(
      { Cor: 'Azul', 'Material da estrutura': 'Madeira' },
      { technicalValues: { Cor: 'Verde' } }
    );
    expect(effectiveValues).toEqual({ cor: 'Verde', 'material da estrutura': 'Madeira' });
    expect(getMissingRequiredCharacteristics(effectiveValues)).toEqual([]);
  });

  it('aproveita dados antigos em formato de atributos e rejeita valores não aplicáveis', () => {
    const effectiveValues = getEffectiveVariationTechnicalValues(
      {},
      {
        attributes: [
          { name: 'Cor', value: 'Azul' },
          { name: 'Material da estrutura', value: 'N/A' },
        ],
      }
    );
    expect(getMissingRequiredCharacteristics(effectiveValues)).toEqual(['Material da estrutura']);
  });
});
