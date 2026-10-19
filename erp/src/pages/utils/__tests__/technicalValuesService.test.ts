import { describe, it, expect } from 'vitest';
import {
  getEffectiveTechnicalValue,
  hasVariationOverride,
  removeVariationOverride,
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
  isDepthCharacteristic,
  isLengthCharacteristic,
  isHeightCharacteristic,
  isWidthCharacteristic,
  isThicknessCharacteristic,
  getDimensionSortRank,
  getCharacteristicDependencyState,
  mergeCharacteristicGroups,
  CHARACTERISTIC_TOPIC_GROUPS,
  isYesNoCharacteristic,
  isYesNoValueActive,
  isExcludedCharacteristic,
} from '../technicalValuesService';

describe('technicalValuesService', () => {
  it('mantém personalizadas em características adicionais e agrupa pés no tópico dedicado Pés', () => {
    const groups = groupCharacteristicsByTopic([
      { name: 'Tipo de pés', isCustom: false },
      { name: 'Acabamento especial', isCustom: true },
    ]);
    expect(groups.map((group) => group.title)).toEqual(['Pés', 'Outras características']);
    expect(groups[1].fields[0].name).toBe('Acabamento especial');
  });

  it('agrupa características nos subtópicos dedicados de Portas, Gavetas, Prateleiras e Pés com ordenação canônica', () => {
    const groups = groupCharacteristicsByTopic([
      { name: 'Material das portas', isCustom: false },
      { name: 'Quantidade de portas', isCustom: false },
      { name: 'Tipo de portas', isCustom: false },
      { name: 'Material das gavetas', isCustom: false },
      { name: 'Quantidade de gavetas', isCustom: false },
      { name: 'Tipo/material da corrediça', isCustom: false },
      { name: 'Peso suportado por prateleira', isCustom: false },
      { name: 'Quantidade de prateleiras', isCustom: false },
      { name: 'Material das prateleiras', isCustom: false },
      { name: 'Material dos pés', isCustom: false },
      { name: 'Possui pés', isCustom: false },
      { name: 'Quantidade de pés', isCustom: false },
      { name: 'Rodízios', isCustom: false },
      { name: 'Pés reguláveis', isCustom: false },
      { name: 'Material dos puxadores', isCustom: false },
      { name: 'Tipo de puxador', isCustom: false },
    ]);

    const titles = groups.map((g) => g.title);
    expect(titles).toContain('Portas');
    expect(titles).toContain('Gavetas');
    expect(titles).toContain('Prateleiras');
    expect(titles).toContain('Pés');
    expect(titles).toContain('Acessórios');

    const portasGroup = groups.find((g) => g.title === 'Portas')!;
    expect(portasGroup.fields.map((f) => f.name)).toEqual([
      'Quantidade de portas',
      'Tipo de portas',
      'Material das portas',
    ]);

    const gavetasGroup = groups.find((g) => g.title === 'Gavetas')!;
    expect(gavetasGroup.fields.map((f) => f.name)).toEqual([
      'Quantidade de gavetas',
      'Tipo/material da corrediça',
      'Material das gavetas',
    ]);

    const prateleirasGroup = groups.find((g) => g.title === 'Prateleiras')!;
    expect(prateleirasGroup.fields.map((f) => f.name)).toEqual([
      'Quantidade de prateleiras',
      'Material das prateleiras',
      'Peso suportado por prateleira',
    ]);

    const pesGroup = groups.find((g) => g.title === 'Pés')!;
    expect(pesGroup.fields.map((f) => f.name)).toEqual([
      'Possui pés',
      'Quantidade de pés',
      'Material dos pés',
      'Pés reguláveis',
      'Rodízios',
    ]);

    const acessoriosGroup = groups.find((g) => g.title === 'Acessórios')!;
    expect(acessoriosGroup.fields.map((f) => f.name)).toEqual([
      'Tipo de puxador',
      'Material dos puxadores',
    ]);
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
    expect(isRequiredCharacteristicName('modelo/linha')).toBe(true);
    expect(isRequiredCharacteristicName('marca')).toBe(true);
    expect(isRequiredCharacteristicName('altura')).toBe(true);
    expect(isRequiredCharacteristicName('largura')).toBe(true);
    expect(isRequiredCharacteristicName('profundidade')).toBe(true);
    expect(isRequiredCharacteristicName('comprimento')).toBe(true);
    expect(isRequiredCharacteristicName('tecido')).toBe(false);
    expect(
      getMissingRequiredCharacteristics({ Cor: 'Preto', Modelo: 'Premium', Marca: 'Morante' })
    ).toEqual([]);
    expect(
      getMissingRequiredCharacteristics({ Cor: 'Preto', 'Modelo/Linha': 'Florença', Marca: 'Móveis Sul' })
    ).toEqual([]);
    expect(getMissingRequiredCharacteristics({ Cor: 'Preto' })).toEqual(['Modelo', 'Marca']);
    expect(
      getMissingRequiredDimensions({ Altura: '180', Largura: '80', Profundidade: '50' })
    ).toEqual([]);
    expect(
      getMissingRequiredDimensions({ Altura: '180', Largura: '80', Comprimento: '50' })
    ).toEqual([]);
    expect(getMissingRequiredDimensions({ Altura: '180' })).toEqual([
      'Largura total',
      'Profundidade total',
    ]);
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

    describe('getAvailableAdditionalFields', () => {
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

      it('não oferece campos inativos nem características excluídas como campos adicionais', () => {
        const fields: TechnicalFieldDefinition[] = [
          ...mockAllFields,
          { id: 'inativo', name: 'Campo Antigo', dataType: 'list', active: false, options: [] },
          { id: 'rec', name: 'Reclinável', dataType: 'radio', options: [] },
          { id: 'lin', name: 'Linha', dataType: 'radio', options: [] },
          { id: 'mod', name: 'Modelo', dataType: 'text_short', options: [] },
        ];

        const available = getAvailableAdditionalFields(fields, []);
        const names = available.map((f) => f.name);

        expect(names).not.toContain('Campo Antigo');
        expect(names).not.toContain('Reclinável');
        expect(names).not.toContain('Linha');
        expect(names).not.toContain('Modelo');
      });
    });

    describe('exclusão canônica de características operacionais e redundantes', () => {
      const createField = (
        name: string,
        categoryIds: string[] = [catMesas],
        dataType: TechnicalFieldDefinition['dataType'] = 'text_short'
      ): TechnicalFieldDefinition => ({
        id: `field-${name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
        name,
        dataType,
        categoryIds,
        options: [],
      });

      it('valida predicado isExcludedCharacteristic para Reclinável, Linha e Modelo isolado', () => {
        // Excluídos (redundantes ou operacionais de produto)
        expect(isExcludedCharacteristic('Reclinável')).toBe(true);
        expect(isExcludedCharacteristic('reclinavel')).toBe(true);
        expect(isExcludedCharacteristic(' Linha ')).toBe(true);
        expect(isExcludedCharacteristic('linha')).toBe(true);
        expect(isExcludedCharacteristic(' Modelo ')).toBe(true);
        expect(isExcludedCharacteristic('modelo')).toBe(true);

        // Permitidos e preservados
        expect(isExcludedCharacteristic('Modelo/Linha')).toBe(false);
        expect(isExcludedCharacteristic('Linha/Modelo')).toBe(false);
        expect(isExcludedCharacteristic('Reclinável manual')).toBe(false);
        expect(isExcludedCharacteristic('Modelo e Linha')).toBe(false);
      });

      it('nunca inclui Reclinável, Linha ou Modelo isolado nos campos aplicáveis', () => {
        const fields = [
          ...mockAllFields,
          createField('Reclinável', [catMesas], 'radio'),
          createField('Linha', [catMesas], 'radio'),
          createField('Modelo', [catMesas]),
          createField('Modelo/Linha', [catMesas]),
        ];

        const applicable = getApplicableTechnicalFields(
          fields,
          [catMesas],
          { Reclinável: 'Sim', Linha: 'Paris', Modelo: 'Imperial' },
          []
        );

        const applicableNames = applicable.map((f) => f.name);
        expect(applicableNames).not.toContain('Reclinável');
        expect(applicableNames).not.toContain('Linha');
        expect(applicableNames).not.toContain('Modelo');
        expect(applicableNames).toContain('Modelo/Linha');
      });

      it('permite que Modelo/Linha herde e substitua valores legados de Modelo e Linha', () => {
        const fields = [createField('Modelo/Linha', [catMesas])];

        // Produto com chave legada Modelo no banco
        const applicableComModeloLegado = getApplicableTechnicalFields(
          fields,
          [catMesas],
          { Modelo: 'Imperial' },
          []
        );
        expect(applicableComModeloLegado.some((f) => f.name === 'Modelo/Linha')).toBe(true);

        // Produto com chave legada Linha no banco
        const applicableComLinhaLegada = getApplicableTechnicalFields(
          fields,
          [catMesas],
          { Linha: 'Paris' },
          []
        );
        expect(applicableComLinhaLegada.some((f) => f.name === 'Modelo/Linha')).toBe(true);
      });
    });

    describe('compatibilidade e herança canônica entre Modelo/Linha e chaves legadas', () => {
      it('resolve herança bi-direcional transparente entre Modelo/Linha e chaves legadas', () => {
        // Fallback para valor do pai gravado como Modelo
        expect(getEffectiveTechnicalValue({ Modelo: 'Imperial' }, {}, 'Modelo/Linha')).toBe('Imperial');
        // Fallback para valor do pai gravado como Linha
        expect(getEffectiveTechnicalValue({ Linha: 'Roma' }, {}, 'Modelo/Linha')).toBe('Roma');
        // Consulta por chave legada recupera valor gravado no pai como Modelo/Linha
        expect(getEffectiveTechnicalValue({ 'Modelo/Linha': 'Veneza' }, {}, 'Modelo')).toBe('Veneza');
        expect(getEffectiveTechnicalValue({ 'Modelo/Linha': 'Veneza' }, {}, 'Linha')).toBe('Veneza');
      });

      it('detecta e remove overrides na variação entre Modelo/Linha e chaves legadas', () => {
        expect(hasVariationOverride({ Modelo: 'Variação 1' }, 'Modelo/Linha')).toBe(true);
        expect(hasVariationOverride({ Linha: 'Variação 2' }, 'Modelo/Linha')).toBe(true);
        expect(hasVariationOverride({ 'Modelo/Linha': 'Variação 3' }, 'Modelo')).toBe(true);

        // removeVariationOverride limpa tanto a chave unificada quanto as chaves legadas
        const cleaned = removeVariationOverride(
          { 'Modelo/Linha': 'Nova', Modelo: 'Antigo', Linha: 'Antiga', Cor: 'Preto' },
          'Modelo/Linha'
        );
        expect(cleaned).toEqual({ Cor: 'Preto' });
        expect(hasVariationOverride(cleaned, 'Modelo/Linha')).toBe(false);
      });
    });

    it('para colchões, exclui Altura e exige Espessura do colchão', () => {
      const catColchoes = '3b616449-7d0c-40fc-9917-70a20836f3b8';
      const fieldsWithColchoes: TechnicalFieldDefinition[] = [
        { id: 'alt', name: 'Altura', dataType: 'measure', isRequired: true, options: [] },
        { id: 'larg', name: 'Largura', dataType: 'measure', isRequired: true, options: [] },
        {
          id: 'esp',
          name: 'Espessura do colchão',
          dataType: 'measure',
          categoryIds: [catColchoes],
          options: [],
        },
      ];

      const applicable = getApplicableTechnicalFields(fieldsWithColchoes, [catColchoes], {}, []);
      const names = applicable.map((f) => f.name);

      expect(names).not.toContain('Altura');
      expect(names).toContain('Espessura do colchão');
      expect(names).toContain('Largura');

      const espField = applicable.find((f) => f.name === 'Espessura do colchão');
      expect(espField?.isRequired).toBe(true);

      const missing = getMissingRequiredDimensions(
        { Largura: '138', Profundidade: '188' },
        undefined,
        { isMattress: true }
      );
      expect(missing).toEqual(['Espessura do colchão']);

      const ok = getMissingRequiredDimensions(
        { Largura: '138', Profundidade: '188', 'Espessura do colchão': '25' },
        undefined,
        { isMattress: true }
      );
      expect(ok).toEqual([]);
    });

    it('identifica corretamente predicados de domínio para medidas e dimensões', () => {
      expect(isDepthCharacteristic('Profundidade')).toBe(true);
      expect(isDepthCharacteristic('Profundidade total')).toBe(true);
      expect(isDepthCharacteristic('Comprimento')).toBe(false);

      expect(isLengthCharacteristic('Comprimento')).toBe(true);
      expect(isLengthCharacteristic('Comprimento total')).toBe(true);
      expect(isLengthCharacteristic('Largura')).toBe(false);

      expect(isHeightCharacteristic('Altura')).toBe(true);
      expect(isHeightCharacteristic('Altura total')).toBe(true);
      expect(isHeightCharacteristic('Profundidade')).toBe(false);

      expect(isWidthCharacteristic('Largura')).toBe(true);
      expect(isWidthCharacteristic('Largura total')).toBe(true);
      expect(isWidthCharacteristic('Altura')).toBe(false);

      expect(isThicknessCharacteristic('Espessura')).toBe(true);
      expect(isThicknessCharacteristic('Espessura do colchão')).toBe(true);
      expect(isThicknessCharacteristic('Altura')).toBe(false);

      expect(getDimensionSortRank('Altura total')).toBe(1);
      expect(getDimensionSortRank('Espessura')).toBe(2);
      expect(getDimensionSortRank('Largura total')).toBe(3);
      expect(getDimensionSortRank('Profundidade total')).toBe(4);
      expect(getDimensionSortRank('Comprimento total')).toBe(5);
      expect(getDimensionSortRank('Peso')).toBe(9);
      expect(getDimensionSortRank('Campo Aleatório')).toBe(99);
    });

    it('ordena Tipo(s) de puxador corretamente no grupo Acessórios', () => {
      const groups = groupCharacteristicsByTopic([
        { name: 'Material dos puxadores', isCustom: false },
        { name: 'Tipo(s) de puxador', isCustom: false },
      ]);
      const acessoriosGroup = groups.find((g) => g.title === 'Acessórios')!;
      expect(acessoriosGroup.fields.map((f) => f.name)).toEqual([
        'Tipo(s) de puxador',
        'Material dos puxadores',
      ]);
    });

    it('ordena Tipo/Material das corrediças corretamente no grupo Gavetas', () => {
      const groups = groupCharacteristicsByTopic([
        { name: 'Material das gavetas', isCustom: false },
        { name: 'Tipo/Material das corrediças', isCustom: false },
        { name: 'Quantidade de gavetas', isCustom: false },
      ]);
      const gavetasGroup = groups.find((g) => g.title === 'Gavetas')!;
      expect(gavetasGroup.fields.map((f) => f.name)).toEqual([
        'Quantidade de gavetas',
        'Tipo/Material das corrediças',
        'Material das gavetas',
      ]);
    });

    it('calcula estado de dependência para características de portas e gavetas', () => {
      // Porta: sem quantidade definida ou zero e sem toggle mestre
      const depDoorZero = getCharacteristicDependencyState('Tipo de portas', {
        'Quantidade de portas': 0,
      });
      expect(depDoorZero.isDependent).toBe(true);
      expect(depDoorZero.isDisabled).toBe(true);
      expect(depDoorZero.disabledReason).toContain('Possui portas for Sim');

      // Porta: switch mestre desligado
      const depDoorOff = getCharacteristicDependencyState('Tipo de portas', {
        'Possui portas': 'Não',
        'Quantidade de portas': 2,
      });
      expect(depDoorOff.isDependent).toBe(true);
      expect(depDoorOff.isDisabled).toBe(true);

      const depDoorEmpty = getCharacteristicDependencyState('Material da porta', {
        'Quantidade de portas': '',
      });
      expect(depDoorEmpty.isDependent).toBe(true);
      expect(depDoorEmpty.isDisabled).toBe(true);

      // Porta: switch mestre ligado
      const depDoorOn = getCharacteristicDependencyState('Tipo de portas', {
        'Possui portas': 'Sim',
      });
      expect(depDoorOn.isDependent).toBe(true);
      expect(depDoorOn.isDisabled).toBe(false);

      // Porta: quantidade positiva (compatibilidade legada)
      const depDoorPositive = getCharacteristicDependencyState('Tipo de portas', {
        'Quantidade de portas': 2,
      });
      expect(depDoorPositive.isDependent).toBe(true);
      expect(depDoorPositive.isDisabled).toBe(false);

      // Gaveta: sem quantidade definida ou zero e sem toggle mestre
      const depDrawerZero = getCharacteristicDependencyState('Materiais das corrediças', {
        'Quantidade de gavetas': 0,
      });
      expect(depDrawerZero.isDependent).toBe(true);
      expect(depDrawerZero.isDisabled).toBe(true);
      expect(depDrawerZero.disabledReason).toContain('Possui gavetas for Sim');

      // Gaveta: switch mestre ligado
      const depDrawerOn = getCharacteristicDependencyState('Materiais das corrediças', {
        'Possui gavetas': 'Sim',
      });
      expect(depDrawerOn.isDependent).toBe(true);
      expect(depDrawerOn.isDisabled).toBe(false);

      // Gaveta: quantidade positiva (compatibilidade legada)
      const depDrawerPositive = getCharacteristicDependencyState('Material das gavetas', {
        'Quantidade de gavetas': 4,
      });
      expect(depDrawerPositive.isDependent).toBe(true);
      expect(depDrawerPositive.isDisabled).toBe(false);

      // Característica independente
      const depOther = getCharacteristicDependencyState('Possui Espelho', {
        'Quantidade de portas': 0,
      });
      expect(depOther.isDependent).toBe(false);
      expect(depOther.isDisabled).toBe(false);
    });

    it('getMissingRequiredTechnicalFields ignora campos dependentes desativados', () => {
      const requiredFields = [
        'Altura',
        'Quantidade de portas',
        'Tipo de portas',
        'Material das portas',
      ];

      // Quando quantidade de portas for 0, Tipo e Material NÃO devem ser reportados como ausentes
      const missingWhenZero = getMissingRequiredTechnicalFields(requiredFields, {
        Altura: '180',
        'Quantidade de portas': 0,
      });
      expect(missingWhenZero).toEqual([]);

      // Quando quantidade de portas for > 0 e Tipo de portas estiver vazio, ele DEVE ser reportado
      const missingWhenPositive = getMissingRequiredTechnicalFields(requiredFields, {
        Altura: '180',
        'Quantidade de portas': 2,
      });
      expect(missingWhenPositive).toEqual(['Tipo de portas', 'Material das portas']);
    });

    it('mergeCharacteristicGroups unifica campos de Portas e Gavetas sob os tópicos canônicos sem duplicação', () => {
      const requiredGroups = [
        {
          title: 'Portas',
          fields: [{ name: 'Quantidade de portas', isRequired: true }],
        },
        {
          title: 'Gavetas',
          fields: [{ name: 'Quantidade de gavetas', isRequired: true }],
        },
      ];

      const optionalGroups = [
        {
          title: 'Portas',
          fields: [
            { name: 'Tipo de portas', isRequired: false },
            { name: 'Material das portas', isRequired: false },
          ],
        },
        {
          title: 'Gavetas',
          fields: [
            { name: 'Materiais das corrediças', isRequired: false },
            { name: 'Material das gavetas', isRequired: false },
          ],
        },
      ];

      const merged = mergeCharacteristicGroups([...requiredGroups, ...optionalGroups]);
      const portaGroup = merged.find((g) => g.title === 'Portas')!;
      const gavetaGroup = merged.find((g) => g.title === 'Gavetas')!;

      expect(portaGroup.fields.map((f) => f.name)).toEqual([
        'Quantidade de portas',
        'Tipo de portas',
        'Material das portas',
      ]);

      expect(gavetaGroup.fields.map((f) => f.name)).toEqual([
        'Quantidade de gavetas',
        'Materiais das corrediças',
        'Material das gavetas',
      ]);
    });

    it('identifica corretamente características binárias de Sim ou Não (isYesNoCharacteristic)', () => {
      // 1. Campo com opções Sim e Não
      expect(
        isYesNoCharacteristic({
          id: '1',
          name: 'Possui espelho',
          options: [{ value: 'Não' }, { value: 'Sim' }],
        })
      ).toBe(true);

      expect(
        isYesNoCharacteristic({
          id: '2',
          name: 'Possui pés',
          options: [{ value: 'Sim' }, { value: 'Não' }],
        })
      ).toBe(true);

      expect(
        isYesNoCharacteristic({
          id: '3',
          name: 'Reclinável',
          options: [{ value: 'Não' }, { value: 'Sim' }],
        })
      ).toBe(true);

      // 2. Campo com tipo de dado boolean
      expect(
        isYesNoCharacteristic({
          id: '4',
          name: 'Possui iluminação',
          dataType: 'boolean',
        })
      ).toBe(true);

      // 3. Campo cujo nome começa com "Possui " e tem poucas ou nenhuma opção
      expect(
        isYesNoCharacteristic({
          id: '5',
          name: 'Possui portas',
          options: [],
        })
      ).toBe(true);

      // 4. Campos que NÃO são Sim/Não
      expect(
        isYesNoCharacteristic({
          id: '6',
          name: 'Material da estrutura',
          options: [{ value: 'MDF' }, { value: 'MDP' }],
        })
      ).toBe(false);

      expect(
        isYesNoCharacteristic({
          id: '7',
          name: 'Quantidade de portas',
          dataType: 'integer',
        })
      ).toBe(false);

      expect(
        isYesNoCharacteristic({
          id: '8',
          name: 'Almofadas',
          options: [
            { value: 'Acompanha almofadas decorativas' },
            { value: 'Almofadas fixas' },
            { value: 'Não' },
            { value: 'Sim' },
          ],
        })
      ).toBe(false);
    });

    it('identifica se o valor está ativo ou desligado (isYesNoValueActive)', () => {
      expect(isYesNoValueActive('Sim')).toBe(true);
      expect(isYesNoValueActive('sim')).toBe(true);
      expect(isYesNoValueActive(true)).toBe(true);
      expect(isYesNoValueActive('true')).toBe(true);
      expect(isYesNoValueActive('ligado')).toBe(true);

      expect(isYesNoValueActive('Não')).toBe(false);
      expect(isYesNoValueActive('nao')).toBe(false);
      expect(isYesNoValueActive(false)).toBe(false);
      expect(isYesNoValueActive('false')).toBe(false);
      expect(isYesNoValueActive('')).toBe(false);
      expect(isYesNoValueActive(undefined)).toBe(false);
      expect(isYesNoValueActive(null)).toBe(false);
    });
  });
});
