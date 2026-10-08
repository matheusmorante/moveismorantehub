import { describe, expect, it } from 'vitest';
import {
  getApplicableProductTechnicalFields,
  getEffectiveProductTechnicalValues,
  getEffectiveVariationTechnicalValues,
  getMissingRequiredCharacteristics,
  getPersistableProductTechnicalValues,
  getProductCharacteristicAttributes,
  groupProductTechnicalFields,
  hasTechnicalValue,
  isExcludedProductTechnicalField,
  isRequiredCharacteristicName,
  upsertProductCharacteristicAttribute,
} from './productCharacteristics';

describe('productCharacteristics', () => {
  it('exige Cor como característica obrigatória, como no ERP', () => {
    expect(isRequiredCharacteristicName('cor')).toBe(true);
    expect(isRequiredCharacteristicName('Material da Estrutura')).toBe(false);
    expect(getMissingRequiredCharacteristics({ Cor: 'Azul' })).toEqual([]);
  });

  it('considera variação própria e herança do produto pai com precedência da variação', () => {
    const effectiveValues = getEffectiveVariationTechnicalValues(
      { Cor: 'Azul', 'Material da estrutura': 'Madeira' },
      { technicalValues: { Cor: 'Verde' } }
    );
    expect(effectiveValues).toEqual({ cor: 'Verde', 'material da estrutura': 'Madeira' });
    expect(getMissingRequiredCharacteristics(effectiveValues)).toEqual([]);
  });

  it('aproveita dados antigos em formato de atributos e rejeita valores não aplicáveis', () => {
    const effectiveValues = getEffectiveVariationTechnicalValues(
      {},
      {
        attributes: [
          { name: 'Cor', value: 'Azul' },
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
});
