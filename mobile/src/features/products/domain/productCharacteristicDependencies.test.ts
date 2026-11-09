import { describe, expect, it } from 'vitest';
import {
  getProductTechnicalDependencyChain,
  isConfiguredFamilyProductTechnicalDependencySatisfied,
  isConfiguredProductTechnicalDependencySatisfied,
} from './productCharacteristics';

describe('productCharacteristics dependencies', () => {
  it('avalia dependências configuradas e permite condições alternativas', () => {
    const quantity = {
      id: 'doors',
      name: 'Quantidade de portas',
      data_type: 'integer',
    };
    const finish = {
      id: 'finish',
      name: 'Acabamento das portas',
      data_type: 'text',
      dependency: {
        referenceAttributeId: 'doors',
        operator: 'greater_than' as const,
        value: '0',
      },
      dependencyAlternatives: [
        {
          referenceAttributeId: 'drawers',
          operator: 'greater_than' as const,
          value: '0',
        },
      ],
    };
    const drawers = {
      id: 'drawers',
      name: 'Quantidade de gavetas',
      data_type: 'integer',
    };
    const fields = [quantity, finish, drawers];

    expect(isConfiguredProductTechnicalDependencySatisfied(finish, fields, { 'Quantidade de portas': '2' })).toBe(true);
    expect(isConfiguredProductTechnicalDependencySatisfied(finish, fields, { 'Quantidade de portas': '0', 'Quantidade de gavetas': '1' })).toBe(true);
    expect(isConfiguredProductTechnicalDependencySatisfied(finish, fields, { 'Quantidade de portas': '0', 'Quantidade de gavetas': '0' })).toBe(false);
  });

  it('falha fechado para referência ausente/cíclica e retorna a cadeia dependente', () => {
    const first = {
      id: 'first',
      name: 'Primeiro',
      dependency: { referenceAttributeId: 'second', operator: 'equals' as const, value: 'sim' },
    };
    const second = {
      id: 'second',
      name: 'Segundo',
      dependency: { referenceAttributeId: 'first', operator: 'equals' as const, value: 'sim' },
    };
    const dependent = {
      id: 'dependent',
      name: 'Dependente',
      dependency: { referenceAttributeId: 'missing', operator: 'equals' as const, value: 'sim' },
    };

    expect(isConfiguredProductTechnicalDependencySatisfied(first, [first, second], { Primeiro: 'sim', Segundo: 'sim' })).toBe(false);
    expect(isConfiguredProductTechnicalDependencySatisfied(dependent, [dependent], {})).toBe(false);
    expect(getProductTechnicalDependencyChain(first, [first, second])).toEqual([first, second]);
  });

  it('avalia dependências variáveis da família por variação ativa sem herdar o valor variável do pai', () => {
    const color = { id: 'color', name: 'Cor', data_type: 'text' };
    const finish = {
      id: 'finish',
      name: 'Acabamento',
      data_type: 'text',
      dependency: {
        referenceAttributeId: 'color',
        operator: 'equals' as const,
        value: 'Azul',
      },
    };
    const fields = [color, finish];
    const parentValues = { Cor: 'Azul' };
    const variableFields = ['Cor'];

    expect(isConfiguredFamilyProductTechnicalDependencySatisfied(
      finish,
      fields,
      parentValues,
      [
        { active: true, attributes: [{ name: 'Cor', value: 'Verde' }] },
        { active: true, technicalValues: { Cor: 'Azul' } },
      ],
      variableFields
    )).toBe(true);

    expect(isConfiguredFamilyProductTechnicalDependencySatisfied(
      finish,
      fields,
      parentValues,
      [
        { active: true, attributes: [{ name: 'Cor', value: 'Verde' }] },
        { active: false, technicalValues: { Cor: 'Azul' } },
      ],
      variableFields
    )).toBe(false);

    expect(isConfiguredFamilyProductTechnicalDependencySatisfied(
      finish,
      fields,
      parentValues,
      [{ active: false, technicalValues: { Cor: 'Verde' } }],
      variableFields
    )).toBe(true);

    expect(isConfiguredFamilyProductTechnicalDependencySatisfied(
      finish,
      fields,
      parentValues,
      [{ active: true }],
      variableFields
    )).toBe(false);

    expect(isConfiguredFamilyProductTechnicalDependencySatisfied(
      finish,
      fields,
      parentValues,
      [{ active: true, attributes: [{ name: 'Cor', value: 'Verde' }] }],
      []
    )).toBe(true);
  });
});
