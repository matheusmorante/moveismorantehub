import { describe, expect, it } from 'vitest';
import {
  getApplicableProductTechnicalFields,
  getEffectiveProductTechnicalValues,
  getEffectiveVariationTechnicalValues,
  getMissingRequiredCharacteristics,
  getMissingRequiredDimensions,
  getPersistableProductTechnicalValues,
  getProductCharacteristicAttributes,
  groupProductTechnicalFields,
  hasTechnicalValue,
  isExcludedProductTechnicalField,
  isProductTechnicalFieldRequired,
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

  it('mantém Reclinável fora dos campos técnicos aplicáveis, como no ERP', () => {
    const fields = [
      { name: 'Reclinável', categoryIds: ['category-1'] },
      { name: 'reclinavel', isRequired: true },
      { name: 'Reclinável manual', categoryIds: ['category-1'] },
      { name: 'Cor' },
    ];

    expect(
      getApplicableProductTechnicalFields(fields, ['category-1'], { Reclinável: 'Sim' }, [
        'reclinavel',
      ]).map(({ name }) => name)
    ).toEqual(['Reclinável manual', 'Cor']);
    expect(isExcludedProductTechnicalField(' RECLINÁVEL ')).toBe(true);
    expect(isExcludedProductTechnicalField('Reclinável manual')).toBe(false);
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
