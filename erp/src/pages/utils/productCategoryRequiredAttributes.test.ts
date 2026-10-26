import { describe, expect, it, vi } from 'vitest';
import {
  fetchRequiredProductCategoryAttributes,
  isProductTechnicalAttributeRequiredByCategories,
  projectRequiredCategoryAttributesToVariations,
} from '../../../../shared-utils/productCategoryRequiredAttributes';
import { syncProductVariationTechnicalAttribute } from '../../../../shared-utils/productVariationTechnicalAttributes';

const requiredMaterial = [
  {
    attributeId: 'material-id',
    name: 'Material',
    requiredCategoryIds: ['category-1'],
  },
];

const createCategoryAttributesClient = (data: unknown, error: unknown = null) => {
  const query: any = {
    select: vi.fn(() => query),
    in: vi.fn(() => query),
    eq: vi.fn().mockResolvedValue({ data, error }),
  };
  const client = { from: vi.fn(() => query) };
  return { client, query };
};

describe('atributos obrigatórios por categoria', () => {
  it('identifica requisito quando qualquer categoria selecionada exige o atributo', () => {
    expect(
      isProductTechnicalAttributeRequiredByCategories(
        ['category-1', 'category-2'],
        ['category-2', 'category-3']
      )
    ).toBe(true);
    expect(isProductTechnicalAttributeRequiredByCategories(['category-1'], ['category-2'])).toBe(
      false
    );
    expect(isProductTechnicalAttributeRequiredByCategories(undefined, ['category-1'])).toBe(false);
  });

  it('carrega vínculos selecionados, agrupa a mesma característica e ignora Peso', async () => {
    const { client, query } = createCategoryAttributesClient([
      {
        attribute_id: 'material-id',
        category_id: 'category-1',
        is_required: true,
        attributes: { id: 'material-id', name: 'Material' },
      },
      {
        attribute_id: 'material-id',
        category_id: 'category-2',
        is_required: true,
        attributes: [{ id: 'material-id', name: 'Material' }],
      },
      {
        attribute_id: 'weight-id',
        category_id: 'category-1',
        is_required: true,
        attributes: { id: 'weight-id', name: 'Peso' },
      },
      {
        attribute_id: 'optional-id',
        category_id: 'category-1',
        is_required: false,
        attributes: { id: 'optional-id', name: 'Cor' },
      },
      {
        attribute_id: 'unselected-id',
        category_id: 'category-3',
        is_required: true,
        attributes: { id: 'unselected-id', name: 'Acabamento' },
      },
    ]);

    const result = await fetchRequiredProductCategoryAttributes(client, [
      ' category-1 ',
      'category-1',
      'category-2',
    ]);

    expect(client.from).toHaveBeenCalledWith('category_attributes');
    expect(query.in).toHaveBeenCalledWith('category_id', ['category-1', 'category-2']);
    expect(query.eq).toHaveBeenCalledWith('is_required', true);
    expect(result).toEqual([
      {
        attributeId: 'material-id',
        name: 'Material',
        requiredCategoryIds: ['category-1', 'category-2'],
      },
    ]);
  });

  it('agrupa requisitos de aliases Modelo/Linha por ordem canônica, não pelo ID do vínculo', async () => {
    const { client } = createCategoryAttributesClient([
      {
        attribute_id: 'z-legacy-line-model',
        category_id: 'cat-z-line',
        is_required: true,
        attributes: { id: 'z-legacy-line-model', name: 'Linha/Modelo' },
      },
      {
        attribute_id: 'a-canonical-model-line',
        category_id: 'cat-a-model',
        is_required: true,
        attributes: { id: 'a-canonical-model-line', name: 'Modelo/Linha' },
      },
    ]);

    const result = await fetchRequiredProductCategoryAttributes(client, [
      'cat-z-line',
      'cat-a-model',
    ]);

    expect(result).toEqual([
      {
        attributeId: 'a-canonical-model-line',
        name: 'Modelo/Linha',
        requiredCategoryIds: ['cat-a-model', 'cat-z-line'],
      },
    ]);
  });

  it('falha fechado quando a leitura dos vínculos retorna erro', async () => {
    const queryError = new Error('falha de leitura');
    const { client } = createCategoryAttributesClient(null, queryError);

    await expect(
      fetchRequiredProductCategoryAttributes(client, ['category-1'])
    ).rejects.toBe(queryError);
  });

  it('rejeita vínculo obrigatório sem identidade ou nome utilizável', async () => {
    const { client } = createCategoryAttributesClient([
      {
        attribute_id: '',
        category_id: 'category-1',
        is_required: true,
        attributes: null,
      },
    ]);

    await expect(
      fetchRequiredProductCategoryAttributes(client, ['category-1'])
    ).rejects.toThrow('Não foi possível identificar uma característica obrigatória da categoria.');
  });

  it('projeta a característica preenchida do pai na variação única do produto simples', () => {
    const variation = { id: 'simple-variation', attributes: [] };

    const [savedVariation] = projectRequiredCategoryAttributesToVariations([variation], {
      categoryIds: ['category-1'],
      requiredAttributes: requiredMaterial,
      parentTechnicalValues: { Material: '  Madeira  ' },
    });

    expect(savedVariation.attributes).toEqual([
      { name: 'Material', value: 'Madeira', showName: false },
    ]);
    expect(variation.attributes).toEqual([]);
  });

  it('projeta Modelo/Linha legado no simples e na família sem substituir override vazio', () => {
    const variations = [
      { id: 'simple', attributes: [] },
      { id: 'family-blue', technicalValues: { 'Linha/Modelo': 'Linha Azul' }, attributes: [] },
      { id: 'family-empty', technicalValues: { 'Modelo/Linha': '' }, attributes: [] },
    ];

    const saved = projectRequiredCategoryAttributesToVariations(variations, {
      categoryIds: ['category-model'],
      requiredAttributes: [
        {
          attributeId: 'attribute-model-line',
          name: 'Modelo/Linha',
          requiredCategoryIds: ['category-model'],
        },
      ],
      parentTechnicalValues: { 'Linha/Modelo': 'Linha Global' },
    });

    expect(saved.map((variation) => variation.attributes)).toEqual([
      [{ name: 'Modelo/Linha', value: 'Linha Global', showName: false }],
      [{ name: 'Modelo/Linha', value: 'Linha Azul', showName: false }],
      [],
    ]);
    expect(variations.map((variation) => variation.attributes)).toEqual([[], [], []]);
  });

  it('preserva alias legado salvo somente em attributes antes de herdar Modelo/Linha do pai', () => {
    const legacyAttributes = [
      { name: 'Linha/Modelo', value: 'Linha própria', showName: false, source: 'legacy' },
    ];

    const [savedVariation] = projectRequiredCategoryAttributesToVariations(
      [{ id: 'family-legacy-attributes', attributes: legacyAttributes }],
      {
        categoryIds: ['category-model'],
        requiredAttributes: [
          {
            attributeId: 'attribute-model-line',
            name: 'Modelo/Linha',
            requiredCategoryIds: ['category-model'],
          },
        ],
        parentTechnicalValues: { 'Modelo/Linha': 'Linha herdada' },
      }
    );

    expect(savedVariation.attributes).toEqual(legacyAttributes);
  });

  it('serializa o atributo canônico exibido antes de um technicalValues com alias legado conflitante', () => {
    const attributes = [
      { name: 'Modelo/Linha', value: 'Atributo da variação', showName: true },
    ];
    const [savedVariation] = projectRequiredCategoryAttributesToVariations(
      [
        {
          id: 'family-conflicting-technical-alias',
          technicalValues: { 'Linha/Modelo': 'TechnicalValues legado' },
          attributes,
        },
      ],
      {
        categoryIds: ['category-model'],
        requiredAttributes: [
          {
            attributeId: 'attribute-model-line',
            name: 'Modelo/Linha',
            requiredCategoryIds: ['category-model'],
          },
        ],
        parentTechnicalValues: { 'Modelo/Linha': 'Modelo do pai' },
      }
    );

    expect(savedVariation.attributes).toEqual(attributes);
  });

  it('projeta uma única linha de Modelo/Linha quando a categoria exige dois aliases legados', () => {
    const requiredAttributes = [
      {
        attributeId: 'legacy-line-model',
        name: 'Linha/Modelo',
        requiredCategoryIds: ['category-model'],
      },
      {
        attributeId: 'canonical-model-line',
        name: 'Modelo/Linha',
        requiredCategoryIds: ['category-model'],
      },
    ];
    const variation = {
      id: 'family-duplicate-model-line',
      attributes: [
        { name: 'Linha/Modelo', value: 'Valor legado', showName: false, source: 'legacy' },
        { name: 'Modelo/Linha', value: 'Valor canônico', showName: true, source: 'canonical' },
      ],
    };

    const project = (orderedRequirements: typeof requiredAttributes) =>
      projectRequiredCategoryAttributesToVariations([variation], {
        categoryIds: ['category-model'],
        requiredAttributes: orderedRequirements,
      })[0].attributes;

    const expected = [
      { name: 'Modelo/Linha', value: 'Valor canônico', showName: true, source: 'canonical' },
    ];
    expect(project(requiredAttributes)).toEqual(expected);
    expect(project([...requiredAttributes].reverse())).toEqual(expected);
  });

  it('aplica edição e limpeza quando um dos vínculos alias continua ativo após remover outra categoria', () => {
    const requiredAttributes = [
      {
        attributeId: 'canonical-model-line',
        name: 'Modelo/Linha',
        requiredCategoryIds: ['cat-removed', 'cat-kept'],
      },
    ];
    const categoryIds = ['cat-kept'];

    const [savedLegacy] = projectRequiredCategoryAttributesToVariations(
      [
        {
          id: 'remaining-category-legacy-value',
          technicalValues: { 'Linha/Modelo': 'Valor legado' },
          attributes: [{ name: 'Linha/Modelo', value: 'Valor legado', showName: true }],
        },
      ],
      { categoryIds, requiredAttributes }
    );
    expect(savedLegacy.attributes).toEqual([
      { name: 'Linha/Modelo', value: 'Valor legado', showName: true },
    ]);

    const [savedCleared] = projectRequiredCategoryAttributesToVariations(
      [
        {
          id: 'remaining-category-cleared-value',
          technicalValues: { 'Modelo/Linha': '', 'Linha/Modelo': 'Valor antigo' },
          attributes: [
            { name: 'Linha/Modelo', value: 'Valor antigo', showName: false },
            { name: 'Modelo', value: 'Duplicata antiga', showName: true },
          ],
        },
      ],
      {
        categoryIds,
        requiredAttributes,
        parentTechnicalValues: { 'Modelo/Linha': 'Valor do pai' },
      }
    );
    expect(savedCleared.attributes).toEqual([]);
  });

  it('projeta o alias do pai pela ordem canônica do campo, não pela ordem do objeto', () => {
    const [savedVariation] = projectRequiredCategoryAttributesToVariations(
      [{ id: 'family-parent-alias-order', attributes: [] }],
      {
        categoryIds: ['category-model'],
        requiredAttributes: [
          {
            attributeId: 'attribute-model-line',
            name: 'Modelo/Linha',
            requiredCategoryIds: ['category-model'],
          },
        ],
        parentTechnicalValues: { Linha: 'Linha do pai', Modelo: 'Modelo do pai' },
      }
    );

    expect(savedVariation.attributes).toEqual([
      { name: 'Modelo/Linha', value: 'Modelo do pai', showName: false },
    ]);
  });

  it.each(['', 'Não se aplica'])('limpa alias legado para valor sem preenchimento: %s', (value) => {
    const [savedVariation] = projectRequiredCategoryAttributesToVariations(
      [
        {
          id: 'family-cleared-legacy',
          technicalValues: { 'Modelo/Linha': value },
          attributes: [{ name: 'Linha/Modelo', value: 'Valor antigo', showName: false }],
        },
      ],
      {
        categoryIds: ['category-model'],
        requiredAttributes: [
          {
            attributeId: 'attribute-model-line',
            name: 'Modelo/Linha',
            requiredCategoryIds: ['category-model'],
          },
        ],
        parentTechnicalValues: { 'Modelo/Linha': 'Valor do pai' },
      }
    );

    expect(savedVariation.attributes).toEqual([]);
  });

  it('atualiza aliases mantendo showName/metadados e remove todas as grafias ao limpar', () => {
    const attributes = [
      { name: 'Linha/Modelo', value: 'Antigo', showName: false, source: 'legacy' },
      { name: 'Modelo', value: 'Antigo duplicado', showName: true, source: 'import' },
      { name: 'Cor', value: 'Azul', showName: true },
    ];

    expect(
      syncProductVariationTechnicalAttribute(attributes, 'Modelo/Linha', 'Atualizado')
    ).toEqual([
      { ...attributes[0], value: 'Atualizado' },
      { ...attributes[1], value: 'Atualizado' },
      attributes[2],
    ]);
    expect(syncProductVariationTechnicalAttribute(attributes, 'Modelo/Linha', '')).toEqual([
      attributes[2],
    ]);
    expect(
      syncProductVariationTechnicalAttribute(attributes, 'Modelo/Linha', 'Não se aplica')
    ).toEqual([attributes[2]]);
  });

  it('prioriza override da variação, depois atributo existente e por fim herança do pai', () => {
    const variations = [
      {
        id: 'variation-1',
        technicalValues: { Material: 'MDF' },
        attributes: [{ name: 'Cor', value: 'Azul', showName: false }],
      },
      {
        id: 'variation-2',
        technicalValues: { Material: 'Balsa' },
        attributes: [
          { name: 'Material', value: 'Freijó', showName: true, source: 'legacy' },
        ],
      },
      {
        id: 'variation-3',
        attributes: [
          { name: 'Material', value: 'Freijó', showName: false, source: 'legacy' },
        ],
      },
      { id: 'variation-4', attributes: [] },
      {
        id: 'variation-5',
        technicalValues: { Material: '' },
        attributes: [],
      },
    ];

    const saved = projectRequiredCategoryAttributesToVariations(variations, {
      categoryIds: ['category-1'],
      requiredAttributes: requiredMaterial,
      parentTechnicalValues: { Material: 'Pinus' },
    });

    expect(saved.map((variation) => variation.attributes)).toEqual([
      [
        { name: 'Cor', value: 'Azul', showName: false },
        { name: 'Material', value: 'MDF', showName: false },
      ],
      [{ name: 'Material', value: 'Balsa', showName: true, source: 'legacy' }],
      [{ name: 'Material', value: 'Freijó', showName: false, source: 'legacy' }],
      [{ name: 'Material', value: 'Pinus', showName: false }],
      [],
    ]);
  });

  it('preserva atributos antigos quando a exigência deixa de valer', () => {
    const attributes = [
      { name: 'Material', value: 'Carvalho', showName: true, legacyOrigin: 'importação' },
      { name: 'Cor', value: 'Natural', showName: false },
      { name: 'Linha/Modelo', value: 'Linha própria', showName: false, legacyOrigin: 'legado' },
    ];
    const variation = { id: 'variation-1', attributes };

    const [savedVariation] = projectRequiredCategoryAttributesToVariations([variation], {
      categoryIds: ['category-1'],
      requiredAttributes: [],
      parentTechnicalValues: { Material: 'MDF' },
    });

    expect(savedVariation.attributes).toEqual(attributes);
    expect(variation.attributes).toEqual(attributes);
  });

  it('não projeta campos opcionais nem valores ausentes', () => {
    const [savedVariation] = projectRequiredCategoryAttributesToVariations(
      [{ id: 'variation-1', attributes: [] }],
      {
        categoryIds: ['category-1'],
        requiredAttributes: [
          { attributeId: 'optional-id', name: 'Cor', requiredCategoryIds: ['category-2'] },
          { attributeId: 'material-id', name: 'Material', requiredCategoryIds: ['category-1'] },
        ],
        parentTechnicalValues: { Cor: 'Azul', Material: '   ' },
      }
    );

    expect(savedVariation.attributes).toEqual([]);
  });
});
