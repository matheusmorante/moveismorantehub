import { describe, it, expect } from 'vitest';
import {
  getEffectiveTechnicalValue,
  getEffectiveVariationTechnicalValues,
  getLegacyVariableTechnicalFieldNames,
  hasVariationOverride,
  isTechnicalFieldVariable,
  removeVariationOverride,
  hasEffectiveDifferenceFromParent,
  resolveVariableTechnicalFieldNames,
  hasEffectiveDifferenceFromParent,
  computeEffectiveVariationName,
  TechnicalFieldDefinition,
  TechnicalValuesMap,
} from '../../technicalValuesService';

describe('technicalValues - Overrides e Nomes de Variação', () => {
  it('identifica valores efetivos e overrides de variação', () => {
    const parentValues: TechnicalValuesMap = {
      Cor: 'Branco',
      Altura: '180',
    };
    const variationOverrides: TechnicalValuesMap = {
      Cor: 'Preto',
    };

    expect(
      getEffectiveTechnicalValue(parentValues, variationOverrides, 'Cor')
    ).toBe('Preto');
    expect(
      getEffectiveTechnicalValue(parentValues, variationOverrides, 'Altura')
    ).toBe('180');
    expect(
      getEffectiveTechnicalValue(parentValues, variationOverrides, 'Profundidade')
    ).toBeUndefined();

    expect(hasVariationOverride(variationOverrides, 'Cor')).toBe(true);
    expect(hasVariationOverride(variationOverrides, 'Altura')).toBe(false);

    const clearedOverrides = removeVariationOverride(variationOverrides, 'Cor');
    expect(hasVariationOverride(clearedOverrides, 'Cor')).toBe(false);
  });

  it('detecta diferença efetiva apenas quando o override diverge do pai', () => {
    const parentValues: TechnicalValuesMap = {
      Cor: 'Branco',
      Marca: 'Morante',
    };
    const fields: TechnicalFieldDefinition[] = [
      { id: '1', name: 'Cor', isRequired: true },
      { id: '2', name: 'Marca', isRequired: true },
    ];

    expect(
      hasEffectiveDifferenceFromParent(
        fields,
        parentValues,
        { Cor: 'Branco', Marca: 'Morante' }
      )
    ).toBe(false);

    expect(
      hasEffectiveDifferenceFromParent(
        fields,
        parentValues,
        { Cor: 'Preto', Marca: 'Morante' }
      )
    ).toBe(true);
  });

  it('infere o modo antigo por overrides e força a herança dos campos fixos', () => {
    const variation = {
      attributes: [{ name: 'Cor', value: 'Preto' }],
      technicalValues: { Marca: 'Marca da variação', Material: 'MDF' },
    };
    const legacyVariableFields = getLegacyVariableTechnicalFieldNames([variation]);

    expect(legacyVariableFields).toEqual(['Cor', 'Marca', 'Material']);
    expect(resolveVariableTechnicalFieldNames(undefined, [variation])).toEqual(legacyVariableFields);
    expect(resolveVariableTechnicalFieldNames([], [variation])).toEqual([]);
    expect(isTechnicalFieldVariable('Material', legacyVariableFields)).toBe(true);

    expect(
      getEffectiveVariationTechnicalValues(
        { Cor: 'Branco', Marca: 'Morante', Material: 'Madeira' },
        variation,
        ['Cor']
      )
    ).toEqual({ Cor: 'Preto', Marca: 'Morante', Material: 'Madeira' });
  });

  it('compõe nome de variação combinando atributos e preservando valores originais', () => {
    const fields: TechnicalFieldDefinition[] = [
      { id: '1', name: 'Cor', isRequired: true, includeInName: true, nameOrder: 1 },
      { id: '2', name: 'Acabamento', isRequired: false, includeInName: true, nameOrder: 2 },
    ];
    const effectiveName = computeEffectiveVariationName(
      'Guarda-Roupa Casal',
      fields,
      { Cor: 'Preto', Acabamento: 'Fosco' }
    );
    expect(effectiveName).toBe('Guarda-Roupa Casal Preto Fosco');
  });
});
