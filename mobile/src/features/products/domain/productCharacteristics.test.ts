import { describe, expect, it } from 'vitest';
import { SINK_CATEGORY_ID } from '../../../../../shared-utils/productSinkCategoryRules';
import { getDefaultShowNameForVariationOverride } from '../../../../../shared-utils/productVariationAttributeDefaults';
import {
  MATTRESS_CATEGORY_ID,
  getApplicableProductTechnicalFields,
  getEffectiveProductTechnicalValues,
  getEffectiveVariationTechnicalValues,
  getMissingRequiredCharacteristics,
  getMissingRequiredDimensions,
  getPersistableProductTechnicalValues,
  getProductCharacteristicAttributes,
  getMobileVariationColorSummary,
  groupProductTechnicalFields,
  hasTechnicalValue,
  getTechnicalValue,
  isMobileVariableTechnicalField,
  isExcludedProductTechnicalField,
  isProductTechnicalFieldRequired,
  isProductTechnicalFieldRequiredForCatalog,
  isRequiredCharacteristicName,
  isWeightCharacteristicName,
  upsertProductCharacteristicAttribute,
  isDepthCharacteristic,
  isLengthCharacteristic,
  isHeightCharacteristic,
  isWidthCharacteristic,
  isThicknessCharacteristic,
  getDimensionSortRank,
} from './productCharacteristics';

describe('productCharacteristics', () => {
  it('define o mesmo default showName de overrides de variação do ERP', () => {
    expect(getDefaultShowNameForVariationOverride('Cor')).toBe(false);
    expect(getDefaultShowNameForVariationOverride(' cor ')).toBe(false);
    expect(getDefaultShowNameForVariationOverride('Material da estrutura')).toBe(true);
  });

  it('atualiza o resumo de cores do produto pai a partir das variações, como no ERP', () => {
    expect(
      getMobileVariationColorSummary([
        { attributes: [{ name: 'Cor', value: 'azul' }, { name: 'Tamanho', value: 'M' }] },
        { attributes: { cor: 'Verde' } },
        { attributes: [{ name: 'Cor', value: 'AZUL' }] },
      ])
    ).toBe('AZUL / VERDE');
    expect(getMobileVariationColorSummary([{ attributes: [{ name: 'Tamanho', value: 'M' }] }])).toBe('');
  });

  it('exige Cor, Modelo, Marca e Dimensões como características obrigatórias, como no ERP', () => {
    expect(isRequiredCharacteristicName('cor')).toBe(true);
    expect(isRequiredCharacteristicName('modelo')).toBe(true);
    expect(isRequiredCharacteristicName('marca')).toBe(true);
    expect(isRequiredCharacteristicName('altura')).toBe(true);
    expect(isRequiredCharacteristicName('largura')).toBe(true);
    expect(isRequiredCharacteristicName('profundidade')).toBe(true);
    expect(isRequiredCharacteristicName('comprimento')).toBe(true);
    expect(isRequiredCharacteristicName('Material da Estrutura')).toBe(false);
    expect(
      getMissingRequiredCharacteristics({ Cor: 'Azul', Modelo: 'Capri', Marca: 'Morante' })
    ).toEqual([]);
    expect(getMissingRequiredCharacteristics({ Cor: 'Azul' })).toEqual(['Modelo', 'Marca']);
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

  it('mantém Peso opcional mesmo quando uma categoria ainda o marca como obrigatório', () => {
    const weightField = {
      name: 'Peso',
      isRequired: true,
      requiredCategoryIds: ['cat-chair'],
      categoryIds: ['cat-chair'],
    };

    expect(isWeightCharacteristicName(' peso ')).toBe(true);
    expect(isProductTechnicalFieldRequired(weightField, ['cat-chair'])).toBe(false);
    expect(
      getApplicableProductTechnicalFields([weightField], ['cat-chair']).map((field) => ({
        name: field.name,
        isRequired: field.isRequired,
        decimal_places: field.decimal_places,
      }))
    ).toEqual([{ name: 'Peso', isRequired: false, decimal_places: 1 }]);
  });

  it('marca uma característica da categoria só como requisito do catálogo, sem torná-la obrigatória para salvar', () => {
    const field = {
      name: 'Acabamento',
      isRequired: false,
      requiredCategoryIds: ['cat-chair'],
      categoryIds: ['cat-chair'],
    };

    expect(isProductTechnicalFieldRequired(field, ['cat-chair'])).toBe(false);
    expect(isProductTechnicalFieldRequiredForCatalog(field, ['cat-chair'])).toBe(true);
    expect(getApplicableProductTechnicalFields([field], ['cat-chair'])[0]).toMatchObject({
      isRequired: false,
      isRequiredForProduct: false,
      isRequiredForCatalog: true,
    });
  });

  it('considera variação própria e herança do produto pai com precedência da variação', () => {
    const effectiveValues = getEffectiveVariationTechnicalValues(
      { Cor: 'Azul', 'Material da estrutura': 'Madeira', Modelo: 'Capri', Marca: 'Morante' },
      { technicalValues: { Cor: 'Verde' } }
    );
    expect(effectiveValues).toEqual({
      cor: 'Verde',
      'material da estrutura': 'Madeira',
      modelo: 'Capri',
      marca: 'Morante',
    });
    expect(getMissingRequiredCharacteristics(effectiveValues)).toEqual([]);
  });

  it('mantém uma característica variável explicitamente vazia em vez de herdar o pai', () => {
    const effectiveValues = getEffectiveVariationTechnicalValues(
      { Cor: 'Azul' },
      { technicalValues: { Cor: '' } },
      ['Cor']
    );

    expect(effectiveValues).toEqual({ cor: '' });
    expect(hasTechnicalValue(effectiveValues, 'Cor')).toBe(true);
  });

  it('aproveita dados antigos em formato de atributos e rejeita valores não aplicáveis', () => {
    const effectiveValues = getEffectiveVariationTechnicalValues(
      {},
      {
        attributes: [
          { name: 'Cor', value: 'Azul' },
          { name: 'Modelo', value: 'Capri' },
          { name: 'Marca', value: 'Morante' },
          { name: 'Material da estrutura', value: 'N/A' },
        ],
      }
    );
    expect(getMissingRequiredCharacteristics(effectiveValues)).toEqual([]);
  });

  it('combina características legadas do produto pai com os valores técnicos atuais', () => {
    expect(
      getEffectiveProductTechnicalValues({
        attributes: [{ name: 'Cor', value: 'Azul' }],
        technicalValues: { Cor: 'Vermelho', 'Material da Estrutura': 'Madeira' },
      })
    ).toEqual({ cor: 'Vermelho', 'material da estrutura': 'Madeira' });
  });

  it('prepara valores técnicos para salvar sem perder atributos legados nem os nomes originais', () => {
    expect(
      getPersistableProductTechnicalValues({
        attributes: [
          { name: 'Cor', value: 'Azul' },
          { name: 'Altura', value: 120 },
        ],
        technical_specs: { technicalValues: { cor: 'Verde', Largura: '80' } },
        technicalValues: { Cor: 'Preto', Profundidade: '50' },
      })
    ).toEqual({
      Altura: 120,
      Largura: '80',
      Cor: 'Preto',
      Profundidade: '50',
    });
  });

  it('preserva showName ao editar uma característica já oculta do nome', () => {
    const updated = upsertProductCharacteristicAttribute(
      [{ name: 'Cor', value: 'Azul', showName: false }],
      'Cor',
      'Verde'
    );

    expect(updated).toEqual([{ name: 'Cor', value: 'Verde', showName: false }]);
    expect(
      getProductCharacteristicAttributes(JSON.stringify(updated)).map(({ name, showName }) => ({
        name,
        showName,
      }))
    ).toEqual([{ name: 'Cor', showName: false }]);
  });

  it('aplica o default de override sem substituir uma preferência showName existente', () => {
    expect(upsertProductCharacteristicAttribute([], 'Cor', 'Verde', false)).toEqual([
      { name: 'Cor', value: 'Verde', showName: false },
    ]);
    expect(upsertProductCharacteristicAttribute([], 'Material da estrutura', 'Madeira')).toEqual([
      { name: 'Material da estrutura', value: 'Madeira', showName: true },
    ]);
    expect(
      upsertProductCharacteristicAttribute([{ name: 'Cor', value: 'Azul' }], 'Cor', 'Verde', false)
    ).toEqual([{ name: 'Cor', value: 'Verde', showName: true }]);
    expect(
      upsertProductCharacteristicAttribute(
        [{ name: 'Cor', value: 'Azul', showName: true }],
        'Cor',
        'Verde',
        false
      )
    ).toEqual([{ name: 'Cor', value: 'Verde', showName: true }]);
  });

  it('exibe características obrigatórias, já preenchidas e ligadas à categoria atual', () => {
    const fields = [
      { name: 'Cor' },
      { name: 'Campo global extra', is_globally_required: true },
      { name: 'Da categoria', categoryIds: ['category-1'] },
      { name: 'De outra categoria', categoryIds: ['category-2'] },
      { name: 'Legado preenchido' },
      { name: 'Campo inativo sem valor', active: false, categoryIds: ['category-1'] },
      { name: 'Campo legado inativo', active: false, categoryIds: ['category-2'] },
    ];

    expect(
      getApplicableProductTechnicalFields(fields, ['category-1'], {
        'Legado preenchido': 'valor',
        'Campo legado inativo': 'valor antigo',
      }).map(({ name }) => name)
    ).toEqual(['Cor', 'Da categoria', 'Legado preenchido', 'Campo legado inativo']);
  });

  it('mantém Altura visível quando a categoria de colchão a exige para o catálogo', () => {
    const requiredHeight = {
      name: 'Altura',
      active: true,
      categoryIds: [MATTRESS_CATEGORY_ID],
      requiredCategoryIds: [MATTRESS_CATEGORY_ID],
    };

    const applicable = getApplicableProductTechnicalFields(
      [requiredHeight],
      [MATTRESS_CATEGORY_ID]
    );

    expect(applicable).toHaveLength(1);
    expect(applicable[0]).toMatchObject({
      name: 'Altura',
      isRequired: false,
      isRequiredForCatalog: true,
    });
    expect(
      getApplicableProductTechnicalFields(
        [{ name: 'Altura', active: true, categoryIds: [MATTRESS_CATEGORY_ID] }],
        [MATTRESS_CATEGORY_ID]
      )
    ).toEqual([]);
  });

  it('aplica as regras de campos da categoria Pias iguais às do ERP', () => {
    const fields = [
      { name: 'Material da estrutura', categoryIds: [SINK_CATEGORY_ID] },
      { name: 'Material da pia', categoryIds: [SINK_CATEGORY_ID] },
      { name: 'Concretada?', categoryIds: [SINK_CATEGORY_ID] },
      { name: 'Possui cuba de inox?', categoryIds: [SINK_CATEGORY_ID] },
    ];

    expect(
      getApplicableProductTechnicalFields(fields, [SINK_CATEGORY_ID]).map(({ name }) => name)
    ).toEqual(['Material da pia', 'Concretada?', 'Possui cuba de inox?']);
  });

  it('detecta Pias pelo vínculo do atributo e não mostra os campos exclusivos em outras categorias', () => {
    const fields = [
      { name: 'Material da pia', categoryIds: ['categoria-pia-legada'] },
      { name: 'Concretada?', categoryIds: ['categoria-pia-legada'] },
      { name: 'Possui cuba de inox?', categoryIds: ['categoria-pia-legada'] },
    ];

    expect(
      getApplicableProductTechnicalFields(fields, ['categoria-pia-legada']).map(({ name }) => name)
    ).toEqual(['Material da pia', 'Concretada?', 'Possui cuba de inox?']);

    const legacyFields = [
      { name: 'Material da pia' },
      { name: 'Concretada?' },
      { name: 'Possui cuba de inox?' },
      { name: 'Material da estrutura', categoryIds: ['categoria-movel'] },
    ];
    const legacyValues = {
      'Material da pia': 'Granito',
      'Concretada?': 'Sim',
      'Possui cuba de inox?': 'Sim',
    };
    expect(
      getApplicableProductTechnicalFields(legacyFields, ['categoria-movel'], legacyValues).map(
        ({ name }) => name
      )
    ).toEqual(['Material da estrutura']);
    expect(
      getApplicableProductTechnicalFields(
        legacyFields,
        ['categoria-movel'],
        legacyValues,
        ['Material da pia']
      ).map(({ name }) => name)
    ).toEqual(['Material da pia', 'Material da estrutura']);
  });

  it('mantém Reclinável, Linha e Modelo (isolado) fora dos campos técnicos aplicáveis, preservando Modelo/Linha', () => {
    const fields = [
      { name: 'Reclinável', categoryIds: ['category-1'] },
      { name: 'reclinavel', isRequired: true },
      { name: 'Reclinável manual', categoryIds: ['category-1'] },
      { name: 'Linha', categoryIds: ['category-1'] },
      { name: 'Modelo', categoryIds: ['category-1'] },
      { name: 'Modelo/Linha', categoryIds: ['category-1'] },
      { name: 'Cor' },
    ];

    expect(
      getApplicableProductTechnicalFields(fields, ['category-1'], { Reclinável: 'Sim', Linha: 'Paris', Modelo: 'Capri' }, [
        'reclinavel',
      ]).map(({ name }) => name)
    ).toEqual(['Reclinável manual', 'Modelo/Linha', 'Cor']);
    expect(isExcludedProductTechnicalField(' RECLINÁVEL ')).toBe(true);
    expect(isExcludedProductTechnicalField('Reclinável manual')).toBe(false);
    expect(isExcludedProductTechnicalField(' Linha ')).toBe(true);
    expect(isExcludedProductTechnicalField(' Modelo ')).toBe(true);
    expect(isExcludedProductTechnicalField('Modelo/Linha')).toBe(false);
    expect(isExcludedProductTechnicalField('Linha/Modelo')).toBe(false);
  });

  it('agrupa requisitos de categoria Modelo/Linha com aliases e IDs distintos', () => {
    const definitions = [
        {
          id: 'legacy-model-line',
          name: 'Linha/Modelo',
          data_type: 'list',
          options: [{ id: 'legacy-option', value: 'Linha legada' }],
          categoryIds: ['cat-line'],
          requiredCategoryIds: ['cat-line'],
          active: true,
        },
        {
          id: 'canonical-model-line',
          name: 'Modelo/Linha',
          data_type: 'text',
          options: [{ id: 'canonical-option', value: 'Modelo canônico' }],
          categoryIds: ['cat-model'],
          requiredCategoryIds: ['cat-model'],
          active: true,
        },
    ];
    const fields = getApplicableProductTechnicalFields(definitions, ['cat-line', 'cat-model']);
    const reversedFields = getApplicableProductTechnicalFields(
      [...definitions].reverse(),
      ['cat-line', 'cat-model']
    );

    expect(fields).toHaveLength(1);
    expect(fields[0]).toMatchObject({
      id: 'canonical-model-line',
      name: 'Modelo/Linha',
      data_type: 'text',
      categoryIds: ['cat-line', 'cat-model'],
      requiredCategoryIds: ['cat-line', 'cat-model'],
      options: [
        { id: 'canonical-option', value: 'Modelo canônico' },
        { id: 'legacy-option', value: 'Linha legada' },
      ],
    });
    expect(reversedFields).toEqual(fields);
  });

  it('mantém o campo e preenche o alias legado após remover uma categoria com requisito compartilhado', () => {
    const mergedDefinition = {
      id: 'canonical-model-line',
      name: 'Modelo/Linha',
      data_type: 'text',
      options: [],
      categoryIds: ['cat-removed', 'cat-kept'],
      requiredCategoryIds: ['cat-removed', 'cat-kept'],
      active: true,
    };
    const remainingFields = getApplicableProductTechnicalFields(
      [mergedDefinition],
      ['cat-kept'],
      { 'Linha/Modelo': 'Valor legado' }
    );

    expect(remainingFields).toHaveLength(1);
    expect(remainingFields[0]).toMatchObject({
      name: 'Modelo/Linha',
      isRequiredForCatalog: true,
    });
    expect(getTechnicalValue({ 'Linha/Modelo': 'Valor legado' }, remainingFields[0].name)).toBe(
      'Valor legado'
    );
    expect(
      getTechnicalValue(
        { 'Modelo/Linha': '', 'Linha/Modelo': 'Valor legado' },
        remainingFields[0].name
      )
    ).toBe('');
  });

  it('mantém compatibilidade com valores legados de Modelo e Linha para Modelo/Linha', () => {
    expect(hasTechnicalValue({ Modelo: 'Capri' }, 'Modelo/Linha')).toBe(true);
    expect(hasTechnicalValue({ Linha: 'Paris' }, 'Modelo/Linha')).toBe(true);
    expect(getTechnicalValue({ Modelo: 'Capri' }, 'Modelo/Linha')).toBe('Capri');
    expect(getTechnicalValue({ Linha: 'Paris' }, 'Modelo/Linha')).toBe('Paris');

    expect(
      getPersistableProductTechnicalValues({
        technicalValues: { Modelo: 'Capri', Cor: 'Azul' },
      })
    ).toEqual({
      'Modelo/Linha': 'Capri',
      Cor: 'Azul',
    });

    expect(
      getPersistableProductTechnicalValues({
        technicalValues: { Linha: 'Paris', Cor: 'Branco' },
      })
    ).toEqual({
      'Modelo/Linha': 'Paris',
      Cor: 'Branco',
    });
  });

  it('resolve aliases legados da variação e mantém override canônico vazio ao editar família', () => {
    expect(isMobileVariableTechnicalField('Linha/Modelo', ['Modelo/Linha'])).toBe(true);

    const inheritedLegacyVariation = getEffectiveVariationTechnicalValues(
      { 'Modelo/Linha': 'Modelo do pai' },
      { technicalValues: { 'Linha/Modelo': 'Paris' } },
      ['Modelo/Linha']
    );
    expect(getTechnicalValue(inheritedLegacyVariation, 'Modelo/Linha')).toBe('Paris');
    expect(hasTechnicalValue(inheritedLegacyVariation, 'Modelo/Linha')).toBe(true);

    const explicitlyClearedVariation = getEffectiveVariationTechnicalValues(
      {},
      { technicalValues: { 'Modelo/Linha': '', Modelo: 'Valor legado antigo' } },
      ['Modelo/Linha']
    );
    expect(getTechnicalValue(explicitlyClearedVariation, 'Modelo/Linha')).toBe('');
  });

  it('atualiza e limpa aliases de atributos da variação preservando showName', () => {
    const legacyAttributes = [{ name: 'Linha/Modelo', value: 'Antigo', showName: false }];

    expect(
      upsertProductCharacteristicAttribute(legacyAttributes, 'Modelo/Linha', 'Atualizado')
    ).toEqual([{ name: 'Linha/Modelo', value: 'Atualizado', showName: false }]);
    expect(upsertProductCharacteristicAttribute(legacyAttributes, 'Modelo/Linha', '')).toEqual([]);
    expect(
      upsertProductCharacteristicAttribute(legacyAttributes, 'Modelo/Linha', 'Não se aplica')
    ).toEqual([]);
  });

  it('exibe o atributo canônico da variação antes de technicalValues com alias legado conflitante', () => {
    const values = getEffectiveVariationTechnicalValues(
      { 'Modelo/Linha': 'Modelo do pai' },
      {
        attributes: [{ name: 'Modelo/Linha', value: 'Atributo da variação', showName: true }],
        technicalValues: { 'Linha/Modelo': 'TechnicalValues legado' },
      },
      ['Modelo/Linha']
    );

    expect(getTechnicalValue(values, 'Modelo/Linha')).toBe('Atributo da variação');
  });

  it('resolve aliases do pai pela ordem canônica do campo, não pela ordem do objeto', () => {
    const parentValues = getEffectiveProductTechnicalValues({
      technicalValues: { Linha: 'Linha do pai', Modelo: 'Modelo do pai' },
    });
    const variationValues = getEffectiveVariationTechnicalValues(parentValues, {});

    expect(getTechnicalValue(variationValues, 'Modelo/Linha')).toBe('Modelo do pai');
  });

  it('mantém Profundidade e Comprimento exclusivos e prioriza a opção preenchida', () => {
    const fields = [
      { name: 'Comprimento', categoryIds: ['category-1'] },
      { name: 'Profundidade', categoryIds: ['category-1'] },
    ];

    expect(
      getApplicableProductTechnicalFields(fields, ['category-1']).map(({ name }) => name)
    ).toEqual(['Profundidade']);
    expect(
      getApplicableProductTechnicalFields(fields, ['category-1'], { comprimento: '80' }).map(
        ({ name }) => name
      )
    ).toEqual(['Comprimento']);
    expect(hasTechnicalValue({ Comprimento: '' }, 'comprimento')).toBe(true);
  });

  it('ordena dimensões com a mesma sequência do ERP', () => {
    const fields = ['Peso', 'Comprimento', 'Altura', 'Profundidade', 'Largura'].map((name) => ({
      name,
    }));

    expect(groupProductTechnicalFields(fields)[0].fields.map(({ name }) => name)).toEqual([
      'Altura',
      'Largura',
      'Profundidade',
      'Comprimento',
      'Peso',
    ]);
  });

  it('identifica corretamente predicados de domínio e ordenação de medidas', () => {
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
    expect(getDimensionSortRank('Outro')).toBe(99);
  });
});
