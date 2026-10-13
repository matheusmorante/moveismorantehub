import { describe, expect, it } from 'vitest';
import {
  getCharacteristicSubtitle,
  getInitialCharacteristicFormData,
  resolveCharacteristicUnit,
  validateCharacteristicSnapshot,
} from './characteristicFormRules';

describe('characteristicFormRules', () => {
  it('normaliza dados iniciais e preserva unidade válida para medidas', () => {
    const formData = getInitialCharacteristicFormData({
      id: 'attr-1',
      name: 'Altura',
      dataType: 'measure',
      unit: 'm',
      active: true,
      options: [{ id: 'opt-1', value: '100' }],
    });

    expect(formData.unit).toBe('m');
    expect(formData.options[0]?.sortOrder).toBe(0);
    expect(resolveCharacteristicUnit('measure', 'invalida')).toBe('cm');
    expect(resolveCharacteristicUnit('weight')).toBe('kg');
    expect(resolveCharacteristicUnit('percentage')).toBe('%');
  });

  it('valida duplicidade de nome, opções obrigatórias e unidade de medida', () => {
    const existing = [
      { id: 'attr-1', name: 'Cor', dataType: 'radio' as const, active: true, options: [] },
    ];

    expect(
      validateCharacteristicSnapshot(
        {
          name: '  cor ',
          dataType: 'text_short',
          unit: '',
          decimalPlaces: 2,
          active: true,
          options: [],
        },
        existing,
        'attr-2'
      )
    ).toBe('Já existe uma característica com esse nome.');

    expect(
      validateCharacteristicSnapshot(
        {
          name: 'Acabamento',
          dataType: 'radio',
          unit: '',
          decimalPlaces: 2,
          active: true,
          options: [],
        },
        existing,
        'attr-2'
      )
    ).toBe('Adicione pelo menos uma opção para este tipo de característica.');
  });

  it('formata o subtítulo de acordo com o tipo de preenchimento', () => {
    expect(
      getCharacteristicSubtitle({
        id: '1',
        name: 'Cor',
        dataType: 'radio',
        active: true,
        options: [{ id: 'o1', value: 'Branco' }],
      })
    ).toBe('Escolha única • 1 opção');

    expect(
      getCharacteristicSubtitle({
        id: '2',
        name: 'Altura',
        dataType: 'measure',
        unit: 'cm',
        active: true,
        options: [],
      })
    ).toBe('Medida • cm');
  });
});
