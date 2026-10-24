import { describe, it, expect } from 'vitest';
import {
  getCharacteristicDependencyState,
  isYesNoCharacteristic,
  isYesNoValueActive,
} from '../../technicalValuesService';

describe('technicalValues - Móveis (Portas, Gavetas, Pés e Sim/Não)', () => {
  it('gerencia dependência de Portas', () => {
    const depOff = getCharacteristicDependencyState('Tipo de portas', {
      'Possui portas': 'Não',
    });
    expect(depOff.isDependent).toBe(true);
    expect(depOff.isDisabled).toBe(true);
    expect(depOff.disabledReason).toContain('quantidade de portas for maior que zero');

    const depOn = getCharacteristicDependencyState('Tipo de portas', {
      'Possui portas': 'Sim',
    });
    expect(depOn.isDependent).toBe(true);
    expect(depOn.isDisabled).toBe(false);

    // Compatibilidade com quantidade legada
    const depLegacy = getCharacteristicDependencyState('Tipo de portas', {
      'Quantidade de portas': '3 portas',
    });
    expect(depLegacy.isDependent).toBe(true);
    expect(depLegacy.isDisabled).toBe(false);

    const quantityZeroOverridesLegacyPossui = getCharacteristicDependencyState('Tipo de portas', {
      'Possui portas': 'Sim',
      'Quantidade de portas': 0,
    });
    expect(quantityZeroOverridesLegacyPossui.isDisabled).toBe(true);

    const quantityWinsOverLegacyNo = getCharacteristicDependencyState('Tipo de portas', {
      'Possui portas': 'Não',
      'Quantidade de portas': 2,
    });
    expect(quantityWinsOverLegacyNo.isDisabled).toBe(false);

    const quantityField = getCharacteristicDependencyState('Quantidade de portas', {
      'Quantidade de portas': 0,
    });
    expect(quantityField.isDependent).toBe(false);
    expect(quantityField.isDisabled).toBe(false);
  });

  it('gerencia dependência de Gavetas', () => {
    const depOff = getCharacteristicDependencyState('Materiais das corrediças', {
      'Possui gavetas': 'Não',
    });
    expect(depOff.isDependent).toBe(true);
    expect(depOff.isDisabled).toBe(true);
    expect(depOff.disabledReason).toContain('quantidade de gavetas for maior que zero');

    const depOn = getCharacteristicDependencyState('Materiais das corrediças', {
      'Possui gavetas': 'Sim',
    });
    expect(depOn.isDependent).toBe(true);
    expect(depOn.isDisabled).toBe(false);

    const quantityZeroOverridesLegacyPossui = getCharacteristicDependencyState(
      'Materiais das corrediças',
      { 'Possui gavetas': 'Sim', 'Quantidade de gavetas': 0 }
    );
    expect(quantityZeroOverridesLegacyPossui.isDisabled).toBe(true);

    const quantityField = getCharacteristicDependencyState('Quantidade de gavetas', {
      'Quantidade de gavetas': 0,
    });
    expect(quantityField.isDependent).toBe(false);
    expect(quantityField.isDisabled).toBe(false);
  });

  it('gerencia dependência de Pés', () => {
    const depOff = getCharacteristicDependencyState('Material dos pés', {
      'Possui pés': 'Não',
    });
    expect(depOff.isDependent).toBe(true);
    expect(depOff.isDisabled).toBe(true);

    const depOn = getCharacteristicDependencyState('Material dos pés', {
      'Possui pés': 'Sim',
    });
    expect(depOn.isDependent).toBe(true);
    expect(depOn.isDisabled).toBe(false);
  });

  it('identifica características binárias Sim/Não e avalia se o valor está ativo', () => {
    expect(
      isYesNoCharacteristic({
        id: '1',
        name: 'Possui portas',
        dataType: 'boolean',
      })
    ).toBe(true);

    expect(
      isYesNoCharacteristic({
        id: '2',
        name: 'Possui portas',
        options: [{ value: 'Sim' }, { value: 'Não' }],
      })
    ).toBe(true);

    expect(
      isYesNoCharacteristic({
        id: '3',
        name: 'Acabamento',
        options: [{ value: 'Fosco' }, { value: 'Brilhante' }],
      })
    ).toBe(false);

    expect(isYesNoValueActive('Sim')).toBe(true);
    expect(isYesNoValueActive('sim')).toBe(true);
    expect(isYesNoValueActive(true)).toBe(true);
    expect(isYesNoValueActive('Não')).toBe(false);
    expect(isYesNoValueActive(false)).toBe(false);
    expect(isYesNoValueActive('')).toBe(false);
    expect(isYesNoValueActive(null)).toBe(false);
  });
});
