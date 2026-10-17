import { describe, it, expect, vi } from 'vitest';
import {
  buildCharacteristicsPrompt,
  buildDescriptiveTextPrompt,
  cleanAndParseCharacteristicsJson,
  normalizeSuggestedTechnicalValues,
} from './aiProductCharacteristicsService';

describe('aiProductCharacteristicsService — Pure Functions & Domain Rules', () => {
  it('buildCharacteristicsPrompt deve compor o prompt com diretrizes de visão e busca', () => {
    const prompt = buildCharacteristicsPrompt({
      productName: 'Guarda-Roupa Casal Sidney',
      brand: 'Madesa',
      model: 'Sidney',
      categoryName: 'Guarda-Roupas',
      description: 'Guarda roupa 6 portas com espelho',
      additionalInfo: 'Corrediças telescópicas e puxador cava',
      availableAttributes: [
        { id: '1', name: 'Material', dataType: 'text', options: ['MDF', 'MDP'] },
        { id: '2', name: 'Tipo de Porta', dataType: 'text', options: ['Correr', 'Bater'] },
      ],
    });

    expect(prompt).toContain('Guarda-Roupa Casal Sidney');
    expect(prompt).toContain('Madesa');
    expect(prompt).toContain('Sidney');
    expect(prompt).toContain('Google Search');
    expect(prompt).toContain('Opções válidas: MDF, MDP');
    expect(prompt).toContain('Opções válidas: Correr, Bater');
  });

  it('cleanAndParseCharacteristicsJson deve remover blocos markdown e retornar o objeto', () => {
    const raw = '```json\n{\n  "technicalValues": { "Material": "MDF" },\n  "height": 218\n}\n```';
    const parsed = cleanAndParseCharacteristicsJson(raw);
    expect(parsed).toEqual({
      technicalValues: { Material: 'MDF' },
      height: 218,
    });
  });

  it('cleanAndParseCharacteristicsJson deve lançar erro legível se JSON for inválido', () => {
    const invalid = 'Não sou um JSON';
    expect(() => cleanAndParseCharacteristicsJson(invalid)).toThrow(
      /A resposta da IA não veio em formato JSON válido/i
    );
  });

  it('normalizeSuggestedTechnicalValues deve casar com opções canônicas independentemente de maiúsculas/minúsculas', () => {
    const rawTechnical = {
      'material da estrutura': 'mdp', // lowercase
      'Tipo de Porta': ['bater', 'correr'], // lowercase array
      'Característica Nova': 'Qualquer valor', // sem atributo no banco
    };

    const availableAttributes = [
      { id: '1', name: 'Material da Estrutura', dataType: 'text', options: ['MDP', 'MDF', 'Madeira'] },
      { id: '2', name: 'Tipo de Porta', dataType: 'multiselect', options: ['Bater', 'Correr', 'Basculante'] },
    ];

    const normalized = normalizeSuggestedTechnicalValues(rawTechnical, availableAttributes);

    // Deve usar o nome canônico do banco 'Material da Estrutura' e valor 'MDP'
    expect(normalized['Material da Estrutura']).toBe('MDP');
    // Deve normalizar cada item do array para as opções oficiais
    expect(normalized['Tipo de Porta']).toEqual(['Bater', 'Correr']);
    // Deve preservar chaves que não tenham opções cadastradas
    expect(normalized['Característica Nova']).toBe('Qualquer valor');
  });

  it('normalizeSuggestedTechnicalValues deve fazer match parcial caso a opção esteja contida no texto da IA', () => {
    const rawTechnical = {
      'Puxador': 'puxador perfil de alumínio passante',
    };

    const availableAttributes = [
      { id: '1', name: 'Puxador', dataType: 'text', options: ['Cava', 'Passante', 'Perfilado', 'Alça'] },
    ];

    const normalized = normalizeSuggestedTechnicalValues(rawTechnical, availableAttributes);
    expect(normalized['Puxador']).toBe('Passante');
  });

  it('buildDescriptiveTextPrompt deve compor o prompt com o texto livre fornecido e mapear atributos', () => {
    const prompt = buildDescriptiveTextPrompt({
      descriptiveText: 'Sofá retrátil 3 lugares tecido suede marrom 220cm largura',
      categoryName: 'Sofás',
      additionalInfo: 'Pés de madeira maciça',
      availableAttributes: [
        { id: '1', name: 'Material do Revestimento', dataType: 'text', options: ['Suede', 'Couro'] },
      ],
    });

    expect(prompt).toContain('Sofá retrátil 3 lugares tecido suede marrom 220cm largura');
    expect(prompt).toContain('Pés de madeira maciça');
    expect(prompt).toContain('Sofás');
    expect(prompt).toContain('Material do Revestimento');
  });
});

