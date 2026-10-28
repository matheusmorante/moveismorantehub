import { describe, expect, it } from 'vitest';
import {
  createCharacteristicFormSchema,
  createManagedCharacteristicFormSchema,
  getCharacteristicSubtitle,
  getInitialCharacteristicFormData,
  normalizeManagedCharacteristicType,
  resolveCharacteristicUnit,
  validateCharacteristicSnapshot,
} from './characteristicFormRules';

const group = { id: 'group-1', name: 'Identificação' };
const validForm = {
  name: 'Cor',
  groupId: group.id,
  dataType: 'radio' as const,
  unit: '',
  decimalPlaces: 2 as const,
  active: true,
  options: [{ id: 'new-option', value: 'Azul', active: true }],
  configuration: {},
  dependency: null,
  dependencyAlternatives: [],
  categoryApplications: [{ categoryId: 'cat-1', application: 'optional' as const }],
};

describe('characteristicFormRules', () => {
  it('normaliza tipos legados e mantém Booleano como tipo de gerenciamento', () => {
    expect(normalizeManagedCharacteristicType('measure')).toBe('decimal');
    expect(normalizeManagedCharacteristicType('weight')).toBe('decimal');
    expect(normalizeManagedCharacteristicType('percentage')).toBe('decimal');
    expect(normalizeManagedCharacteristicType('boolean')).toBe('boolean');
    expect(normalizeManagedCharacteristicType('list')).toBe('radio');
    expect(resolveCharacteristicUnit('measure', 'invalida')).toBe('cm');
    expect(resolveCharacteristicUnit('weight')).toBe('kg');
    expect(resolveCharacteristicUnit('percentage')).toBe('%');

    const formData = getInitialCharacteristicFormData({
      id: 'attr-1', name: 'Altura', dataType: 'measure', unit: 'm', active: true,
      options: [{ id: 'opt-1', value: '100' }],
    }, group.id);
    expect(formData.dataType).toBe('decimal');
    expect(formData.groupId).toBe(group.id);
    expect(formData.unit).toBe('m');
    expect(formData.options[0]?.sortOrder).toBe(0);
  });

  it('guarda aplicação por característica com obrigatória, opcional e indisponível', () => {
    const schema = createManagedCharacteristicFormSchema([], undefined, [group], ['cat-1', 'cat-2']);
    const categoryApplications = [
      { categoryId: 'cat-1', application: 'required' },
      { categoryId: 'cat-2', application: 'unavailable' },
    ];
    expect(schema.safeParse({ ...validForm, categoryApplications }).success).toBe(true);
    expect(schema.safeParse({
      ...validForm,
      categoryApplications: categoryApplications.slice(0, 1),
    }).success).toBe(false);
  });

  it('inicia cada aplicação por categoria como opcional', () => {
    const categories = [{ id: 'cat-1', name: 'Guarda-roupas' }];
    const initial = getInitialCharacteristicFormData(null, group.id, categories);
    expect(initial.categoryApplications).toEqual([{ categoryId: 'cat-1', application: 'optional' }]);

    const schema = createManagedCharacteristicFormSchema([], undefined, [group], ['cat-1']);
    expect(schema.safeParse({ ...validForm, categoryApplications: initial.categoryApplications }).success).toBe(true);
    expect(schema.safeParse({
      ...validForm,
      categoryApplications: [{ categoryId: 'cat-1', application: 'unavailable' }],
    }).success).toBe(true);
  });

  it('requer grupo válido e nome exclusivo no formulário de gerenciamento', () => {
    const schema = createManagedCharacteristicFormSchema([
      { id: 'attr-1', name: 'Cor', dataType: 'radio', active: true, options: [] },
    ], undefined, [group], ['cat-1']);
    expect(schema.safeParse({ ...validForm, groupId: '' }).success).toBe(false);
    expect(schema.safeParse({ ...validForm, groupId: 'missing' }).success).toBe(false);
    expect(schema.safeParse({ ...validForm, name: ' cor ' }).success).toBe(false);
  });

  it('valida opções ativas e configuração por tipo', () => {
    const schema = createManagedCharacteristicFormSchema([], undefined, [group], ['cat-1']);
    expect(schema.safeParse({ ...validForm, options: [] }).success).toBe(false);
    expect(schema.safeParse({ ...validForm, options: [{ id: 'o1', value: 'Azul', active: false }] }).success).toBe(false);
    expect(schema.safeParse({ ...validForm, options: [{ id: 'o1', value: 'Azul' }, { id: 'o2', value: ' azul ' }] }).success).toBe(false);
    expect(schema.safeParse({
      ...validForm,
      dataType: 'text_short',
      options: [],
      configuration: { minLength: 12, maxLength: 4 },
    }).success).toBe(false);
    expect(schema.safeParse({
      ...validForm,
      dataType: 'integer',
      options: [],
      configuration: { minValue: 1.5 },
    }).success).toBe(false);
    expect(schema.safeParse({ ...validForm, dataType: 'boolean', options: [] }).success).toBe(true);
  });

  it('bloqueia dependência circular e referência a opção inativa', () => {
    const allCharacteristics = [
      { id: 'a', name: 'A', dataType: 'text_short' as const, active: true, options: [] },
      {
        id: 'b', name: 'B', dataType: 'radio' as const, active: true,
        options: [{ id: 'b-option', value: 'Sim', active: true }],
        dependency: { referenceAttributeId: 'a', operator: 'contains' as const, value: 'ok' },
      },
    ];
    expect(validateCharacteristicSnapshot({
      ...validForm,
      dependency: { referenceAttributeId: 'b', operator: 'equals', value: 'Sim' },
    }, allCharacteristics, 'a', [group])).toBe('Esta condição criaria uma dependência circular.');

    const inactiveOptionCharacteristics = allCharacteristics.map((item) => item.id === 'b'
      ? { ...item, options: [{ id: 'b-option', value: 'Sim', active: false }] }
      : item);
    expect(validateCharacteristicSnapshot({
      ...validForm,
      dependency: { referenceAttributeId: 'b', operator: 'equals', value: 'Sim' },
    }, inactiveOptionCharacteristics, undefined, [group])).toBe('Selecione uma opção ativa da característica de referência.');
  });

  it('valida condições Sim/Não que referenciam uma característica booleana', () => {
    const booleanReference = [{
      id: 'usb', name: 'Entrada USB', dataType: 'boolean' as const, active: true, options: [],
    }];
    const snapshot = {
      ...validForm,
      dependency: { referenceAttributeId: 'usb', operator: 'equals' as const, value: 'Não' },
    };

    expect(validateCharacteristicSnapshot(snapshot, booleanReference, undefined, [group])).toBeNull();
    expect(validateCharacteristicSnapshot({
      ...snapshot,
      dependency: { ...snapshot.dependency, value: 'Talvez' },
    }, booleanReference, undefined, [group])).toBe('Selecione Sim ou Não para a condição booleana.');
  });

  it('valida alternativas e impede ciclos por condições alternativas', () => {
    const references = [
      { id: 'a', name: 'A', dataType: 'integer' as const, active: true, options: [] },
      { id: 'b', name: 'B', dataType: 'integer' as const, active: true, options: [],
        dependency: { referenceAttributeId: 'a', operator: 'greater_than' as const, value: '0' },
        dependencyAlternatives: [{ referenceAttributeId: 'current', operator: 'equals' as const, value: '1' }] },
    ];
    const condition = { referenceAttributeId: 'a', operator: 'greater_than' as const, value: '0' };
    expect(validateCharacteristicSnapshot({ ...validForm, dependency: condition,
      dependencyAlternatives: [{ ...condition, referenceAttributeId: 'b' }] }, references, 'current', [group]))
      .toBe('Esta condição criaria uma dependência circular.');
    expect(validateCharacteristicSnapshot({ ...validForm, dependency: condition,
      dependencyAlternatives: [condition] }, references, 'current', [group]))
      .toContain('apenas uma vez');
  });

  it('mantém a validação antiga do editor de características do formulário de produto', () => {
    const schema = createCharacteristicFormSchema();
    const legacy = {
      name: 'Acabamento', dataType: 'list', unit: '', decimalPlaces: 2, active: true,
      options: [{ id: '', value: 'Fosco' }],
    };
    expect(schema.safeParse(legacy).success).toBe(true);
    expect(schema.safeParse({ ...legacy, options: [] }).success).toBe(false);
  });

  it('formata o subtítulo com tipo e opções ativas', () => {
    expect(getCharacteristicSubtitle({
      id: '1', name: 'Cor', dataType: 'radio', active: true,
      options: [{ id: 'o1', value: 'Branco' }, { id: 'o2', value: 'Preto', active: false }],
    })).toBe('Opção única • 1 opção ativa');
    expect(getCharacteristicSubtitle({
      id: '2', name: 'Altura', dataType: 'measure', unit: 'cm', active: true, options: [],
    })).toContain('Número decimal • cm');
    expect(getCharacteristicSubtitle({
      id: '3', name: 'Entrada USB', dataType: 'boolean', active: true, options: [],
    })).toBe('Booleano · Sim/Não');
  });
});
