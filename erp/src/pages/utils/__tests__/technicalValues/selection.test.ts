import { describe, it, expect } from 'vitest';
import {
  getApplicableTechnicalFields,
  getAvailableAdditionalFields,
  getEffectiveTechnicalValue,
  TechnicalFieldDefinition,
  TechnicalValuesMap,
} from '../../technicalValuesService';

describe('technicalValues - Seleção e Aplicabilidade de Campos', () => {
  const sampleFields: TechnicalFieldDefinition[] = [
    { id: '1', name: 'Altura', dataType: 'text', options: [], isRequired: true, active: true },
    { id: '2', name: 'Largura', dataType: 'text', options: [], isRequired: true, active: true },
    { id: '3', name: 'Profundidade', dataType: 'text', options: [], isRequired: true, active: true },
    { id: '4', name: 'Comprimento', dataType: 'text', options: [], isRequired: true, active: true },
    { id: '5', name: 'Acabamento', dataType: 'text', options: [], categoryIds: ['cat-a'], active: true },
    { id: '6', name: 'Material da estrutura', dataType: 'text', options: [], categoryIds: ['cat-b'], active: true },
    { id: '7', name: 'Campo Excluído Reclinável', dataType: 'text', options: [], active: true },
    { id: '8', name: 'Inativo Com Valor', dataType: 'text', options: [], active: false },
    { id: '9', name: 'Inativo Sem Valor', dataType: 'text', options: [], active: false },
  ];

  it('inclui campos vinculados à categoria ativa do produto', () => {
    const applicable = getApplicableTechnicalFields(sampleFields, ['cat-a']);
    const names = applicable.map((f) => f.name);
    expect(names).toContain('Acabamento');
    expect(names).not.toContain('Material da estrutura');
  });

  it('mantém a exigência da categoria separada da obrigatoriedade para salvar o produto', () => {
    const [field] = getApplicableTechnicalFields(
      [{
        id: 'category-only', name: 'Acabamento', dataType: 'text', options: [],
        requiredCategoryIds: ['cat-a'], active: true,
      }],
      ['cat-a']
    );

    expect(field).toMatchObject({ isRequired: false, isRequiredForCatalog: true });
  });

  it('agrupa requisitos da mesma característica Modelo/Linha apesar de IDs e aliases distintos', () => {
    const definitions: TechnicalFieldDefinition[] = [
      {
        id: 'legacy-model-line',
        name: 'Linha/Modelo',
        dataType: 'list',
        options: [{ id: 'legacy-option', value: 'Linha legada' }],
        categoryIds: ['cat-line'],
        requiredCategoryIds: ['cat-line'],
        active: true,
      },
      {
        id: 'canonical-model-line',
        name: 'Modelo/Linha',
        dataType: 'text',
        options: [{ id: 'canonical-option', value: 'Modelo canônico' }],
        categoryIds: ['cat-model'],
        requiredCategoryIds: ['cat-model'],
        active: true,
      },
    ];
    const fields = getApplicableTechnicalFields(definitions, ['cat-line', 'cat-model']);
    const reversedFields = getApplicableTechnicalFields(
      [...definitions].reverse(),
      ['cat-line', 'cat-model']
    );

    expect(fields).toHaveLength(1);
    expect(fields[0]).toMatchObject({
      id: 'canonical-model-line',
      name: 'Modelo/Linha',
      dataType: 'text',
      categoryIds: ['cat-line', 'cat-model'],
      requiredCategoryIds: ['cat-line', 'cat-model'],
      isRequiredForCatalog: true,
      options: [
        { id: 'canonical-option', value: 'Modelo canônico' },
        { id: 'legacy-option', value: 'Linha legada' },
      ],
    });
    expect(reversedFields).toEqual(fields);
  });

  it('mantém o campo e o valor legado após remover uma categoria que compartilhava o requisito', () => {
    const mergedDefinition: TechnicalFieldDefinition = {
      id: 'canonical-model-line',
      name: 'Modelo/Linha',
      dataType: 'text',
      options: [],
      categoryIds: ['cat-removed', 'cat-kept'],
      requiredCategoryIds: ['cat-removed', 'cat-kept'],
      active: true,
    };
    const remainingFields = getApplicableTechnicalFields(
      [mergedDefinition],
      ['cat-kept'],
      { 'Linha/Modelo': 'Valor legado' }
    );

    expect(remainingFields).toHaveLength(1);
    expect(remainingFields[0]).toMatchObject({
      name: 'Modelo/Linha',
      isRequiredForCatalog: true,
    });
    expect(
      getEffectiveTechnicalValue({}, { 'Linha/Modelo': 'Valor legado' }, remainingFields[0].name)
    ).toBe('Valor legado');
    expect(
      getEffectiveTechnicalValue(
        {},
        { 'Modelo/Linha': '', 'Linha/Modelo': 'Valor legado' },
        remainingFields[0].name
      )
    ).toBe('');
  });

  it('preserva campos que já possuem valor cadastrado no produto mesmo inativos', () => {
    const productValues: TechnicalValuesMap = {
      'Inativo Com Valor': 'Presente',
    };
    const applicable = getApplicableTechnicalFields(
      sampleFields,
      ['cat-a'],
      productValues
    );
    const names = applicable.map((f) => f.name);
    expect(names).toContain('Inativo Com Valor');
    expect(names).not.toContain('Inativo Sem Valor');
  });

  it('resolve exclusividade entre Profundidade e Comprimento mantendo o que possui valor ou manual', () => {
    // Caso padrão sem valores: prefere Profundidade
    const defaultRes = getApplicableTechnicalFields(sampleFields, ['cat-a']);
    const defaultNames = defaultRes.map((f) => f.name);
    expect(defaultNames).toContain('Profundidade');
    expect(defaultNames).not.toContain('Comprimento');

    // Quando Comprimento possui valor, mantém Comprimento
    const lengthValRes = getApplicableTechnicalFields(
      sampleFields,
      ['cat-a'],
      { Comprimento: '200' }
    );
    const lengthNames = lengthValRes.map((f) => f.name);
    expect(lengthNames).toContain('Comprimento');
    expect(lengthNames).not.toContain('Profundidade');
  });

  it('retorna especificações adicionais disponíveis que ainda não estão visíveis', () => {
    const visible = [sampleFields[0], sampleFields[1]];
    const additional = getAvailableAdditionalFields(sampleFields, visible);
    const names = additional.map((f) => f.name);
    expect(names).not.toContain('Altura');
    expect(names).not.toContain('Largura');
    expect(names).toContain('Acabamento');
  });
});
