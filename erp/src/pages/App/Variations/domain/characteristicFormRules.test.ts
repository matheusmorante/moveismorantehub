import { describe, expect, it } from 'vitest';
import {
  getCharacteristicSubtitle,
  getInitialCharacteristicFormData,
  resolveCharacteristicUnit,
  validateCharacteristicSnapshot,
  createCharacteristicFormSchema,
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

  it('rejeita nome vazio, escolhas ausentes e opções vazias ou duplicadas no schema compartilhado', () => {
    const schema = createCharacteristicFormSchema();
    const base = { name: 'Cor', dataType: 'radio', unit: '', decimalPlaces: 2, active: true, options: [{ id: '', value: 'Azul' }] };
    for (const invalid of [
      { ...base, name: ' ' },
      { ...base, options: [] },
      { ...base, options: [{ id: '', value: ' ' }] },
      { ...base, options: [{ id: '1', value: 'Azul' }, { id: '2', value: ' azul ' }] },
    ]) expect(schema.safeParse(invalid).success).toBe(false);
  });

  it('preserva os contratos de decimal, medida e tipos legados', () => {
    const schema = createCharacteristicFormSchema();
    const base = { name: 'Altura', dataType: 'measure', unit: 'cm', decimalPlaces: 2, active: true, options: [] };
    expect(schema.safeParse(base).success).toBe(true);
    expect(schema.safeParse({ ...base, unit: 'invalid' }).success).toBe(false);
    expect(schema.safeParse({ ...base, dataType: 'decimal', decimalPlaces: 4 }).success).toBe(false);
    expect(schema.safeParse({ ...base, dataType: 'list', options: [] }).success).toBe(false);
    expect(schema.safeParse({ ...base, dataType: 'number' }).success).toBe(true);
  });

  it('consulta o identificador atual no resolver para não bloquear o próprio autosave', () => {
    const current = { id: undefined as string | undefined };
    const schema = createCharacteristicFormSchema([
      { id: 'saved', name: 'Cor', active: true, options: [] },
    ], () => current.id);
    const values = { name: 'Cor', dataType: 'text_short', active: true, options: [] };
    expect(schema.safeParse(values).success).toBe(false);
    current.id = 'saved';
    expect(schema.safeParse(values).success).toBe(true);
  });
});
