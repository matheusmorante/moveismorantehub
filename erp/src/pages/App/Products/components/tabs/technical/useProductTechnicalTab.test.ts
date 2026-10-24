// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useProductTechnicalTab } from './useProductTechnicalTab';
import * as technicalFieldService from '../../../services/technicalFieldService';
import { Product } from '../../../../../types/product.type';

vi.mock('../../../services/technicalFieldService', () => ({
  fetchTechnicalFieldDefinitions: vi.fn(),
}));

describe('useProductTechnicalTab', () => {
  const mockFieldDefinitions = [
    { id: '1', name: 'Altura', isRequired: true, active: true },
    { id: '2', name: 'Largura', isRequired: true, active: true },
    { id: '3', name: 'Profundidade', isRequired: true, active: true },
    { id: '4', name: 'Comprimento', isRequired: false, active: true },
    { id: '5', name: 'Marca', isRequired: false, active: true },
    { id: '6', name: 'Material da estrutura', isRequired: false, active: true },
    { id: '7', name: 'Quantidade de portas', isRequired: false, active: true },
    { id: '8', name: 'Tipo de portas', isRequired: false, active: true },
    { id: '9', name: 'Material das portas', isRequired: false, active: true },
    { id: '10', name: 'Quantidade de gavetas', isRequired: false, active: true },
    { id: '11', name: 'Materiais das corrediças', isRequired: false, active: true },
    { id: '12', name: 'Material das gavetas', isRequired: false, active: true },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(technicalFieldService.fetchTechnicalFieldDefinitions).mockResolvedValue(
      mockFieldDefinitions as any
    );
  });

  it('atualiza valores técnicos e sincroniza dimensões e variações com o pai', async () => {
    let currentProduct: Partial<Product> = {
      name: 'Sofá Florença',
      technicalValues: {},
      variations: [
        {
          id: 'v1',
          name: 'Variacao 1',
          description: 'Desc',
          syncHeight: true,
          width: 0,
          height: 0,
          depth: 0,
          weight: 0,
        } as any,
      ],
    };

    const setFormData = vi.fn((updater) => {
      currentProduct = typeof updater === 'function' ? updater(currentProduct) : updater;
    });

    const { result } = renderHook(() =>
      useProductTechnicalTab({
        formData: currentProduct,
        setFormData,
      })
    );

    act(() => {
      result.current.handleTechnicalValueChange('Altura', '110,5');
    });

    expect(currentProduct.technicalValues?.['Altura']).toBe('110,5');
    expect(currentProduct.height).toBe(110.5);
    expect(currentProduct.variations?.[0].height).toBe(110.5);

    act(() => {
      result.current.handleTechnicalValueChange('Marca', 'Morante');
    });

    expect(currentProduct.brand).toBe('Morante');
    expect(currentProduct.technicalValues?.['Marca']).toBe('Morante');
  });

  it('permite adicionar e remover características manuais', () => {
    let currentProduct: Partial<Product> = {
      technicalValues: {},
    };
    const setFormData = vi.fn((updater) => {
      currentProduct = typeof updater === 'function' ? updater(currentProduct) : updater;
    });

    const { result } = renderHook(() =>
      useProductTechnicalTab({
        formData: currentProduct,
        setFormData,
      })
    );

    act(() => {
      result.current.handleAddManualField({
        id: '6',
        name: 'Material da estrutura',
        dataType: 'text',
        options: [],
        isRequired: false,
      });
    });

    expect(result.current.manualFieldNames).toContain('Material da estrutura');
    expect(currentProduct.technicalValues?.['Material da estrutura']).toBe('');

    act(() => {
      result.current.handleRemoveManualField('Material da estrutura');
    });

    expect(result.current.manualFieldNames).not.toContain('Material da estrutura');
    expect(currentProduct.technicalValues?.['Material da estrutura']).toBeUndefined();
  });

  it('alterna a característica do pai entre fixa e variável sem alterar os valores legados', () => {
    let currentProduct: Partial<Product> = {
      technicalValues: { Cor: 'Branco' },
      variations: [
        {
          id: 'v1',
          attributes: [{ name: 'Cor', value: 'Azul' }],
          technicalValues: { Material: 'MDF' },
        } as any,
      ],
    };
    const originalVariation = currentProduct.variations?.[0];
    const setFormData = vi.fn((updater) => {
      currentProduct = typeof updater === 'function' ? updater(currentProduct) : updater;
    });

    const { result } = renderHook(() =>
      useProductTechnicalTab({ formData: currentProduct, setFormData })
    );

    act(() => result.current.handleToggleVariableField('Marca'));
    expect(currentProduct.variableTechnicalFields).toEqual(['Cor', 'Material', 'Marca']);

    act(() => result.current.handleToggleVariableField('Cor'));
    expect(currentProduct.variableTechnicalFields).toEqual(['Material', 'Marca']);
    expect(currentProduct.variations?.[0]).toEqual(originalVariation);
  });

  it('impede desligar características obrigatórias do produto ou da categoria', async () => {
    vi.mocked(technicalFieldService.fetchTechnicalFieldDefinitions).mockResolvedValueOnce([
      ...mockFieldDefinitions,
      {
        id: '13', name: 'Acabamento', isRequired: false, requiredCategoryIds: ['cat-1'], active: true,
      },
    ] as any);
    let currentProduct: Partial<Product> = {
      categoryIds: ['cat-1'],
      variableTechnicalFields: ['Altura', 'Acabamento'],
      technicalValues: { Altura: '180', Acabamento: 'Madeira' },
    };
    const setFormData = vi.fn((updater) => {
      currentProduct = typeof updater === 'function' ? updater(currentProduct) : updater;
    });
    const { result } = renderHook(() =>
      useProductTechnicalTab({ formData: currentProduct, setFormData })
    );

    await act(async () => { await Promise.resolve(); });
    act(() => {
      result.current.handleToggleVariableField('Altura', 'not_inform');
      result.current.handleToggleVariableField('Acabamento', 'not_inform');
    });

    expect(currentProduct.variableTechnicalFields).toEqual(['Altura', 'Acabamento']);
    expect(currentProduct.technicalValues?.Altura).toBe('180');
    expect(currentProduct.technicalValues?.Acabamento).toBe('Madeira');
  });

  it('mantém características preenchidas ou selecionadas sempre visíveis mesmo alterando a pesquisa', async () => {
    let currentProduct: Partial<Product> = {
      technicalValues: {
        'Material da estrutura': 'MDF',
      },
    };
    const setFormData = vi.fn((updater) => {
      currentProduct = typeof updater === 'function' ? updater(currentProduct) : updater;
    });

    const { result } = renderHook(() =>
      useProductTechnicalTab({
        formData: currentProduct,
        setFormData,
      })
    );

    // Espera carregar definições
    await act(async () => {
      await Promise.resolve();
    });

    // Sem busca: campo preenchido está presente em fieldGroups
    const allFieldNamesBeforeSearch = result.current.fieldGroups.flatMap((g) =>
      g.fields.map((f) => f.name)
    );
    expect(allFieldNamesBeforeSearch).toContain('Material da estrutura');

    // Busca por outro termo sem adicionar esse campo à ficha
    act(() => {
      result.current.setCharacteristicSearchTerm('Comprimento');
    });

    // O campo preenchido "Material da estrutura" DEVE CONTINUAR VISÍVEL
    const allFieldNamesDuringSearch = result.current.fieldGroups.flatMap((g) =>
      g.fields.map((f) => f.name)
    );
    expect(allFieldNamesDuringSearch).toContain('Material da estrutura');
    expect(allFieldNamesDuringSearch).not.toContain('Comprimento');

    // Altera a pesquisa para outro termo (ex: 'inexistente')
    act(() => {
      result.current.setCharacteristicSearchTerm('inexistente');
    });

    const allFieldNamesDuringOtherSearch = result.current.fieldGroups.flatMap((g) =>
      g.fields.map((f) => f.name)
    );
    // Campo preenchido CONTINUA visível!
    expect(allFieldNamesDuringOtherSearch).toContain('Material da estrutura');
    expect(allFieldNamesDuringOtherSearch).not.toContain('Comprimento');

    // Limpa a pesquisa
    act(() => {
      result.current.setCharacteristicSearchTerm('');
    });

    const allFieldNamesAfterClear = result.current.fieldGroups.flatMap((g) =>
      g.fields.map((f) => f.name)
    );
    expect(allFieldNamesAfterClear).toContain('Material da estrutura');
  });

  it('pesquisa "portas" e adiciona o grupo completo via handleAddTopicGroup', async () => {
    let currentProduct: Partial<Product> = {
      technicalValues: {},
    };
    const setFormData = vi.fn((updater) => {
      currentProduct = typeof updater === 'function' ? updater(currentProduct) : updater;
    });

    const { result } = renderHook(() =>
      useProductTechnicalTab({
        formData: currentProduct,
        setFormData,
      })
    );

    await act(async () => {
      await Promise.resolve();
    });

    act(() => {
      result.current.setCharacteristicSearchTerm('portas');
    });

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 350));
    });

    expect(result.current.matchingGroups.length).toBeGreaterThanOrEqual(1);
    const portaGroup = result.current.matchingGroups.find((g) => g.id === 'portas')!;
    expect(portaGroup).toBeDefined();

    act(() => {
      result.current.handleAddGroup(portaGroup);
    });

    // Todos os campos do grupo de portas foram adicionados
    expect(result.current.manualFieldNames).toContain('Quantidade de portas');
    expect(result.current.manualFieldNames).toContain('Tipo de portas');
    expect(result.current.manualFieldNames).toContain('Material das portas');

    // A busca é limpa após adicionar o grupo
    expect(result.current.characteristicSearchTerm).toBe('');
  });

  it('limpa valores dependentes de portas quando a quantidade for alterada para 0', async () => {
    let currentProduct: Partial<Product> = {
      technicalValues: {
        'Quantidade de portas': 2,
        'Tipo de portas': 'De correr',
        'Material das portas': 'MDF',
      },
    };
    const setFormData = vi.fn((updater) => {
      currentProduct = typeof updater === 'function' ? updater(currentProduct) : updater;
    });

    const { result } = renderHook(() =>
      useProductTechnicalTab({
        formData: currentProduct,
        setFormData,
      })
    );

    await act(async () => {
      await Promise.resolve();
    });

    act(() => {
      result.current.handleTechnicalValueChange('Quantidade de portas', 0);
    });

    expect(currentProduct.technicalValues?.['Quantidade de portas']).toBe(0);
    expect(currentProduct.technicalValues?.['Tipo de portas']).toBe('');
    expect(currentProduct.technicalValues?.['Material das portas']).toBe('');
  });

  it('limpa valores dependentes de gavetas quando a quantidade for alterada para 0', async () => {
    let currentProduct: Partial<Product> = {
      technicalValues: {
        'Quantidade de gavetas': 3,
        'Materiais das corrediças': ['Telescópica'],
        'Material das gavetas': 'MDP',
      },
    };
    const setFormData = vi.fn((updater) => {
      currentProduct = typeof updater === 'function' ? updater(currentProduct) : updater;
    });

    const { result } = renderHook(() =>
      useProductTechnicalTab({
        formData: currentProduct,
        setFormData,
      })
    );

    await act(async () => {
      await Promise.resolve();
    });

    act(() => {
      result.current.handleTechnicalValueChange('Quantidade de gavetas', 0);
    });

    expect(currentProduct.technicalValues?.['Quantidade de gavetas']).toBe(0);
    expect(currentProduct.technicalValues?.['Materiais das corrediças']).toEqual([]);
    expect(currentProduct.technicalValues?.['Material das gavetas']).toBe('');
  });
});
