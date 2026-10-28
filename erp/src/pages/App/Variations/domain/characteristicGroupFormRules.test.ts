import { describe, expect, it } from 'vitest';
import {
  createCharacteristicGroupFormSchema,
  getInitialCharacteristicGroupFormData,
} from '../../../../../../shared-utils/characteristicGroupFormRules';

describe('characteristicGroupFormRules', () => {
  it('inicia somente o nome porque grupos são organizacionais', () => {
    const form = getInitialCharacteristicGroupFormData(null);
    expect(form).toEqual({ name: '' });
    expect(createCharacteristicGroupFormSchema().safeParse({ ...form, name: 'Portas' }).success).toBe(true);
  });

  it('impede nomes duplicados sem diferenciar maiúsculas', () => {
    const schema = createCharacteristicGroupFormSchema([
      { id: 'existing', name: 'Dimensões' },
    ]);
    expect(schema.safeParse({
      id: 'new', name: ' dimensões ',
    }).success).toBe(false);
  });
});
