import { describe, expect, it } from 'vitest';
import {
  evaluateCharacteristicDependency,
  getCharacteristicDependencyOperators,
} from '../../../../../../shared-utils/characteristicDependencyRules';

describe('characteristicDependencyRules', () => {
  it('oferece operadores compatíveis com o tipo de referência', () => {
    expect(getCharacteristicDependencyOperators('radio')).toEqual(['equals', 'not_equals']);
    expect(getCharacteristicDependencyOperators('boolean')).toEqual(['equals', 'not_equals']);
    expect(getCharacteristicDependencyOperators('multi_select')).toEqual(['contains', 'not_contains']);
    expect(getCharacteristicDependencyOperators('integer')).toContain('greater_than');
  });

  it('avalia textos sem diferença de acento e números por comparação numérica', () => {
    expect(evaluateCharacteristicDependency(
      { referenceAttributeId: 'fabric', operator: 'equals', value: 'algodão' },
      'text_short',
      'Algodao'
    )).toBe(true);
    expect(evaluateCharacteristicDependency(
      { referenceAttributeId: 'height', operator: 'greater_or_equal', value: '100' },
      'integer',
      '120'
    )).toBe(true);
  });

  it('não habilita condição quando a referência ainda não foi preenchida', () => {
    expect(evaluateCharacteristicDependency(
      { referenceAttributeId: 'color', operator: 'equals', value: 'Azul' },
      'radio',
      null
    )).toBe(false);
  });

  it('avalia condições booleanas com valores atuais e legados Sim/Não', () => {
    expect(evaluateCharacteristicDependency(
      { referenceAttributeId: 'usb', operator: 'equals', value: 'Sim' },
      'boolean',
      true
    )).toBe(true);
    expect(evaluateCharacteristicDependency(
      { referenceAttributeId: 'usb', operator: 'equals', value: 'Não' },
      'boolean',
      'Não'
    )).toBe(true);
    expect(evaluateCharacteristicDependency(
      { referenceAttributeId: 'usb', operator: 'not_equals', value: 'Sim' },
      'boolean',
      false
    )).toBe(true);
    expect(evaluateCharacteristicDependency(
      { referenceAttributeId: 'usb', operator: 'equals', value: 'Não' },
      'radio',
      false
    )).toBe(true);
  });

  it('avalia quantidade em opções de cuba sem alterar as opções existentes', () => {
    const options = [{ value: '1 cuba (Simples)' }, { value: '2 cubas (Dupla)' }, { value: '1 cuba e meia' }];
    expect(getCharacteristicDependencyOperators('radio', options)).toContain('greater_than');
    const condition = { referenceAttributeId: 'sink', operator: 'greater_than' as const, value: '0' };
    expect(evaluateCharacteristicDependency(condition, 'radio', '1 cuba e meia')).toBe(true);
    expect(evaluateCharacteristicDependency(condition, 'radio', '0 cubas')).toBe(false);
    expect(evaluateCharacteristicDependency(condition, 'radio', '')).toBe(false);
    expect(getCharacteristicDependencyOperators('radio', [{ value: 'MDF' }])).not.toContain('greater_than');
  });
});
