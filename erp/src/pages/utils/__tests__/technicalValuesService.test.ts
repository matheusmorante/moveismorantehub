import { describe, it, expect } from 'vitest';
import {
  getEffectiveTechnicalValue,
  hasVariationOverride,
  removeVariationOverride,
  setVariationOverride,
  areEffectiveValuesEqual,
  hasEffectiveDifferenceFromParent,
  computeEffectiveVariationName,
  getApplicableTechnicalFields,
  getAvailableAdditionalFields,
  getMissingRequiredTechnicalFields,
  groupCharacteristicsByTopic,
  isRequiredCharacteristicName,
  getMissingRequiredCharacteristics,
  getMissingRequiredDimensions,
  TechnicalFieldDefinition,
  TechnicalValuesMap,
} from '../technicalValuesService';

describe('technicalValuesService', () => {
  it('mantém personalizadas em características adicionais e não cria tópico removido', () => {
    const groups = groupCharacteristicsByTopic([
      { name: 'Tipo de pés', isCustom: false },
      { name: 'Acabamento especial', isCustom: true },
    ]);
    expect(groups.map((group) => group.title)).toEqual(['Acessórios', 'Outras características']);
    expect(groups[1].fields[0].name).toBe('Acabamento especial');
  });

  it('agrupa Modelo e Marca dentro de Características principais', () => {
    const groups = groupCharacteristicsByTopic([
      { name: 'Modelo', isCustom: false },
      { name: 'Marca', isCustom: false },
      { name: 'Cor', isCustom: false },
    ]);
    expect(groups.map((group) => group.title)).toEqual(['Características principais']);
    expect(groups[0].fields.map((f) => f.name)).toEqual(['Modelo', 'Marca', 'Cor']);
  });
  it('exige Cor, Modelo, Marca e Dimensões como características obrigatórias globais', () => {
    expect(isRequiredCharacteristicName('cor')).toBe(true);
    expect(isRequiredCharacteristicName('modelo')).toBe(true);
    expect(isRequiredCharacteristicName('marca')).toBe(true);
    expect(isRequiredCharacteristicName('altura')).toBe(true);
    expect(isRequiredCharacteristicName('largura')).toBe(true);
    expect(isRequiredCharacteristicName('profundidade')).toBe(true);
    expect(isRequiredCharacteristicName('comprimento')).toBe(true);
    expect(isRequiredCharacteristicName('tecido')).toBe(false);
    expect(
      getMissingRequiredCharacteristics({ Cor: 'Preto', Modelo: 'Premium', Marca: 'Morante' })
    ).toEqual([]);
    expect(getMissingRequiredCharacteristics({ Cor: 'Preto' })).toEqual(['Modelo', 'Marca']);
    expect(
      getMissingRequiredDimensions({ Altura: '180', Largura: '80', Profundidade: '50' })
    ).toEqual([]);
    expect(
      getMissingRequiredDimensions({ Altura: '180', Largura: '80', Comprimento: '50' })
    ).toEqual([]);
    expect(getMissingRequiredDimensions({ Altura: '180' })).toEqual(['Largura', 'Profundidade']);
  });

  it('exige valor somente nas especificações globais obrigatórias', () => {
    const missing = getMissingRequiredTechnicalFields(['Cor', 'Estrutura'], {
      Cor: 'Branco',
      Estrutura: '',
      Observação: '',
    });

    expect(missing).toEqual(['Estrutura']);
  });

  it('mantém Peso opcional mesmo com configuração global ou de categoria legada', () => {
    const peso: TechnicalFieldDefinition = {
      id: 'peso',
      name: 'Peso',
      dataType: 'measure',
      isRequired: true,
      requiredCategoryIds: ['cat-chair'],
      categoryIds: ['cat-chair'],
      options: [],
    };

    const applicable = getApplicableTechnicalFields([peso], ['cat-chair']);
    expect(applicable.map((field) => field.isRequired)).toEqual([false]);
    expect(applicable.map((field) => field.decimalPlaces)).toEqual([1]);
  });

  it('formata Peso com 1 casa decimal no nome da variação', () => {
    const peso: TechnicalFieldDefinition = {
      id: 'peso',
      name: 'Peso',
      dataType: 'weight',
      unit: 'kg',
      includeInName: true,
      options: [],
    };
    const name = computeEffectiveVariationName('Sofá Florença', [peso], { Peso: 15.5 });
    expect(name).toBe('Sofá Florença 15,5 kg');
  });

  it('herda valor padrão do produto pai quando não há override', () => {
    const parent = { Cor: 'Branco', Portas: 6 };
    const variation = {};

    expect(getEffectiveTechnicalValue(parent, variation, 'Cor')).toBe('Branco');
    expect(getEffectiveTechnicalValue(parent, variation, 'Portas')).toBe(6);
  });

  it('aplica override da variação quando definido', () => {
    const parent = { Cor: 'Branco', Portas: 6 };
    const variation = { Cor: 'Nature' };

    expect(getEffectiveTechnicalValue(parent, variation, 'Cor')).toBe('Nature');
    expect(getEffectiveTechnicalValue(parent, variation, 'Portas')).toBe(6);
  });

  it('respeita valor 0 sem confundir com ausência de valor', () => {
    const parent = { Portas: 6, Gavetas: 2 };
    const variation = { Gavetas: 0 };

    expect(getEffectiveTechnicalValue(parent, variation, 'Gavetas')).toBe(0);
  });

  it('respeita valor false sem confundir com ausência de valor', () => {
    const parent = { 'Possui Espelho': true };
    const variation = { 'Possui Espelho': false };

    expect(getEffectiveTechnicalValue(parent, variation, 'Possui Espelho')).toBe(false);
  });

  it('remove override e volta a herdar o valor do pai', () => {
    const parent = { Cor: 'Branco' };
    let variation: TechnicalValuesMap = { Cor: 'Nature' };

    expect(hasVariationOverride(variation, 'Cor')).toBe(true);
    expect(getEffectiveTechnicalValue(parent, variation, 'Cor')).toBe('Nature');

    variation = removeVariationOverride(variation, 'Cor');
    expect(hasVariationOverride(variation, 'Cor')).toBe(false);
    expect(getEffectiveTechnicalValue(parent, variation, 'Cor')).toBe('Branco');
  });

  it('detecta se a variação tem diferença real em relação ao pai', () => {
    const fields: TechnicalFieldDefinition[] = [
      { id: '1', name: 'Cor', dataType: 'list', options: [] },
      { id: '2', name: 'Portas', dataType: 'integer', options: [] },
    ];
    const parent = { Cor: 'Branco', Portas: 6 };

    // Mesmos valores efetivos, ainda que possua override falso
    const variationEqual = { Cor: 'Branco', Portas: 6 };
    expect(hasEffectiveDifferenceFromParent(fields, parent, variationEqual)).toBe(false);

    // Valor diferente
    const variationDiff = { Cor: 'Nature', Portas: 6 };
    expect(hasEffectiveDifferenceFromParent(fields, parent, variationDiff)).toBe(true);
  });

  it('gera nome automático da variação respeitando formatação e ordem', () => {
    const fields: TechnicalFieldDefinition[] = [
      { id: '1', name: 'Cor', dataType: 'list', nameOrder: 10, options: [] },
      { id: '2', name: 'Portas', dataType: 'integer', unit: 'Portas', nameOrder: 20, options: [] },
      {
        id: '3',
        name: 'Gavetas',
        dataType: 'integer',
        unit: 'Gavetas',
        nameOrder: 30,
        options: [],
      },
      { id: '4', name: 'Espelho', dataType: 'boolean', nameOrder: 40, options: [] },
      { id: '5', name: 'Material', dataType: 'list', includeInName: false, options: [] },
    ];

    const effectiveValues = {
      Cor: 'Nature',
      Portas: 6,
      Gavetas: 2,
      Espelho: true,
      Material: 'MDF',
    };

    const generatedName = computeEffectiveVariationName(
      'Guarda-Roupa Madrid',
      fields,
      effectiveValues
    );
    expect(generatedName).toBe('Guarda-Roupa Madrid Nature 6 Portas 2 Gavetas Com Espelho');
  });

  describe('getApplicableTechnicalFields & getAvailableAdditionalFields', () => {
    const catMesas = 'cat-mesas-uuid';
    const catGuardaRoupas = 'cat-guardaroupas-uuid';

    const mockAllFields: TechnicalFieldDefinition[] = [
      { id: '1', name: 'Cor', dataType: 'list', categoryIds: [], options: [] }, // Global
      { id: '2', name: 'Material', dataType: 'list', categoryIds: [], options: [] }, // Global
      {
        id: '3',
        name: 'Quantidade de portas',
        dataType: 'integer',
        categoryIds: [catGuardaRoupas],
        options: [],
      }, // Específico Guarda-Roupa
      {
        id: '4',
        name: 'Quantidade de gavetas',
        dataType: 'integer',
        categoryIds: [catGuardaRoupas],
        options: [],
      }, // Específico Guarda-Roupa
      { id: '5', name: 'Formato', dataType: 'list', categoryIds: [catMesas], options: [] }, // Específico Mesa
    ];

    it('inclui apenas campos configurados para a categoria do produto', () => {
      const applicable = getApplicableTechnicalFields(mockAllFields, [catMesas], {}, []);
      const names = applicable.map((f) => f.name);

      expect(names).toEqual(['Formato']);
      expect(names).not.toContain('Cor');
      expect(names).not.toContain('Material');
      expect(names).not.toContain('Quantidade de portas');
      expect(names).not.toContain('Quantidade de gavetas');
    });

    it('inclui especificação obrigatória global mesmo sem categoria', () => {
      const applicable = getApplicableTechnicalFields(
        [
          { id: 'material', name: 'Material', dataType: 'list', isRequired: true, options: [] },
          { id: 'porta', name: 'Tipo de Porta', dataType: 'list', options: [] },
        ],
        [],
        {},
        []
      );

      expect(applicable.map((field) => field.name)).toEqual(['Material']);
    });

    it('permite adicionar manualmente campos que não são da categoria', () => {
      const applicable = getApplicableTechnicalFields(
        mockAllFields,
        [catMesas],
        {},
        ['Quantidade de portas'] // Adicionado manualmente
      );
      const names = applicable.map((f) => f.name);

      expect(names).toContain('Quantidade de portas');
      expect(names).toContain('Formato');
    });

    it('preserva campos que já possuem valores preenchidos mesmo se a categoria mudar', () => {
      // Produto originalmente tinha valor em Quantidade de portas, e agora está na categoria Mesas
      const applicable = getApplicableTechnicalFields(
        mockAllFields,
        [catMesas],
        { 'Quantidade de portas': '2' },
        []
      );
      const names = applicable.map((f) => f.name);

      expect(names).toContain('Quantidade de portas');
      expect(names).toContain('Formato');
    });

    it('retorna apenas os campos centrais ainda não presentes como opções adicionais', () => {
      const currentVisible = [
        mockAllFields[0], // Cor
        mockAllFields[1], // Material
        mockAllFields[4], // Formato
      ];

      const available = getAvailableAdditionalFields(mockAllFields, currentVisible);
      const availableNames = available.map((f) => f.name);

      expect(availableNames).toEqual(['Quantidade de portas', 'Quantidade de gavetas']);
    });

    it('nunca inclui a característica Reclinável nos campos aplicáveis nem nos adicionais', () => {
      const fieldsWithReclinavel = [
        ...mockAllFields,
        {
          id: 'rec-1',
          name: 'Reclinável',
          dataType: 'radio' as const,
          options: [{ id: '1', value: 'Sim' }],
          categoryIds: [catMesas],
        },
      ];

      const applicable = getApplicableTechnicalFields(
        fieldsWithReclinavel,
        [catMesas],
        { Reclinável: 'Sim' },
        []
      );
      expect(applicable.some((f) => f.name.toLowerCase().includes('reclinável'))).toBe(false);

      const available = getAvailableAdditionalFields(fieldsWithReclinavel, []);
      expect(available.some((f) => f.name.toLowerCase().includes('reclinável'))).toBe(false);
    });
  });
});
