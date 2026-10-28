import { describe, expect, it } from 'vitest';
import {
  getProductTechnicalDimensionField,
  parseProductTechnicalDimension,
} from '../../../../../../../../../shared-utils/productTechnicalDimensions';
import { applyTechnicalValueChangeToProduct } from './valueChange';

describe('productTechnicalDimensions', () => {
  it.each([
    ['Altura', 'height'],
    ['Altura total', 'height'],
    ['Largura', 'width'],
    ['Largura total', 'width'],
    ['Profundidade', 'depth'],
    ['Profundidade total', 'depth'],
    ['Peso', 'weight'],
  ])('mapeia %s para %s', (name, field) => {
    expect(getProductTechnicalDimensionField(name)).toBe(field);
  });

  it('não converte características técnicas sem coluna dimensional', () => {
    expect(getProductTechnicalDimensionField('Espessura do colchão')).toBeNull();
    expect(getProductTechnicalDimensionField('Altura do assento')).toBeNull();
  });

  it.each([
    [120.5, 120.5],
    [' 85,5 ', 85.5],
    ['180', 180],
    ['', undefined],
    ['Não se aplica', undefined],
    [0, undefined],
    [-1, undefined],
    [Number.NaN, undefined],
    [null, undefined],
  ])('converte %s conforme a dimensão persistível', (value, expected) => {
    expect(parseProductTechnicalDimension(value)).toBe(expected);
  });

  it('aplica os aliases de medida ao campo raiz e às variações que herdam', () => {
    const updated = applyTechnicalValueChangeToProduct(
      {
        technicalValues: {},
        variations: [{ syncWidth: true, syncHeight: true, width: 80, height: 120 }],
      } as any,
      'Altura total',
      '180,5'
    );

    expect(updated.height).toBe(180.5);
    expect(updated.variations?.[0]?.height).toBe(180.5);
  });

  it('mantém texto de não aplicável nos valores técnicos sem colocá-lo na dimensão numérica', () => {
    const updated = applyTechnicalValueChangeToProduct(
      { technicalValues: {}, width: 80 } as any,
      'Largura total',
      'Não se aplica'
    );

    expect(updated.technicalValues?.['Largura total']).toBe('Não se aplica');
    expect(updated.width).toBeUndefined();
  });
});
