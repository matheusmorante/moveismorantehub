import { describe, expect, it } from 'vitest';
import { isYesNoCharacteristic } from './yesNo';

describe('isYesNoCharacteristic ERP/mobile shared rule', () => {
  it('classifies boolean domain fields as yes/no', () => {
    expect(isYesNoCharacteristic({ id: '1', name: 'Possui pés', dataType: 'boolean', options: [] })).toBe(true);
  });

  it('accepts Sim/Não options and an optional Não se aplica option', () => {
    expect(
      isYesNoCharacteristic({
        id: '2',
        name: 'Instalação',
        dataType: 'radio',
        options: [
          { id: 'sim', value: 'Sim' },
          { id: 'nao', value: 'Não' },
          { id: 'na', value: 'Não se aplica' },
        ],
      })
    ).toBe(true);
  });

  it('does not classify a list containing only Não se aplica as yes/no', () => {
    expect(
      isYesNoCharacteristic({
        id: '3',
        name: 'Instalação',
        dataType: 'list',
        options: [{ id: 'na', value: 'Não se aplica' }],
      })
    ).toBe(false);
  });

  it('accepts a classic Possui field with unloaded options', () => {
    expect(
      isYesNoCharacteristic({ id: '4', name: 'Possui pés', dataType: 'list', options: [] })
    ).toBe(true);
  });

  it('rejects non-binary configured options for a classic Possui field', () => {
    expect(
      isYesNoCharacteristic({
        id: '5',
        name: 'Possui pés',
        dataType: 'list',
        options: [{ id: 'na', value: 'Não se aplica' }],
      })
    ).toBe(false);
    expect(
      isYesNoCharacteristic({
        id: '6',
        name: 'Possui pés',
        dataType: 'list',
        options: [{ id: 'wood', value: 'Madeira' }],
      })
    ).toBe(false);
  });

  it('does not classify an unrelated option list as yes/no', () => {
    expect(
      isYesNoCharacteristic({
        id: '7',
        name: 'Cor',
        dataType: 'list',
        options: [{ id: 'blue', value: 'Azul' }],
      })
    ).toBe(false);
  });
});
