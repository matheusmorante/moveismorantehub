// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useProductTechnicalTab } from './useProductTechnicalTab';
import * as technicalFieldService from '../../../services/technicalFieldService';
import * as characteristicGroupService from '@/pages/utils/characteristicGroupService';
import { Product } from '../../../../../types/product.type';
import { mockFieldDefinitions } from './useProductTechnicalTabTestFixtures';

vi.mock('../../../services/technicalFieldService', () => ({
  fetchTechnicalFieldDefinitions: vi.fn(),
}));

vi.mock('@/pages/utils/characteristicGroupService', () => ({
  fetchCharacteristicGroups: vi.fn(),
}));

describe('useProductTechnicalTab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(technicalFieldService.fetchTechnicalFieldDefinitions).mockResolvedValue(
      mockFieldDefinitions as any
    );
    vi.mocked(characteristicGroupService.fetchCharacteristicGroups).mockResolvedValue({
      groups: [],
      categories: [],
    });
  });

  it('pesquisa "portas" e adiciona o grupo completo via handleAddTopicGroup', async () => {
    let currentProduct: Partial<Product> = {
      categoryIds: ['cat-1'],
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

  it('adiciona somente a característica pesquisada a um grupo organizacional', async () => {
    let currentProduct: Partial<Product> = {
      categoryIds: ['category-1'],
      selectedCharacteristicIds: [],
      activeCharacteristicIds: [],
      technicalValues: {},
    };
    const setFormData = vi.fn((updater) => {
      currentProduct = typeof updater === 'function' ? updater(currentProduct) : updater;
    });
    vi.mocked(characteristicGroupService.fetchCharacteristicGroups).mockResolvedValueOnce({
      groups: [{
        id: 'drawers',
        name: 'Gavetas',
      }],
      categories: [{ id: 'category-1', name: 'Cômodas' }],
    });

    const { result } = renderHook(() =>
      useProductTechnicalTab({ formData: currentProduct, setFormData })
    );
    await act(async () => { await Promise.resolve(); });

    act(() => result.current.handleAddCharacteristicFromSearch({
      id: 'drawer-runner',
      name: 'Tipo de corrediça',
      groupId: 'drawers',
      dataType: 'radio',
      options: [],
    }));

    expect(currentProduct.selectedCharacteristicIds).toEqual(['drawer-runner']);
    expect(currentProduct.activeCharacteristicIds).toEqual(['drawer-runner']);
    expect(currentProduct.technicalValues).toMatchObject({ 'Tipo de corrediça': '' });
    expect(currentProduct.selectedCharacteristicGroupIds).toBeUndefined();
  });

  it('adiciona somente a característica pesquisada e sua cadeia de dependências', async () => {
    const fields = [
      {
        id: 'drawer-quantity',
        name: 'Quantidade de gavetas',
        groupId: 'drawers',
        dataType: 'integer',
        options: [],
        categoryIds: ['category-1'],
        active: true,
      },
      {
        id: 'drawer-runner',
        name: 'Tipo de corrediça',
        groupId: 'drawers',
        dataType: 'radio',
        options: [],
        categoryIds: ['category-1'],
        dependency: {
          referenceAttributeId: 'drawer-quantity',
          operator: 'greater_than',
          value: '0',
        },
        active: true,
      },
      {
        id: 'drawer-material',
        name: 'Material das gavetas',
        groupId: 'drawers',
        dataType: 'radio',
        options: [],
        categoryIds: ['category-1'],
        active: true,
      },
    ];
    vi.mocked(technicalFieldService.fetchTechnicalFieldDefinitions).mockResolvedValueOnce(fields as any);
    vi.mocked(characteristicGroupService.fetchCharacteristicGroups).mockResolvedValueOnce({
      groups: [{
        id: 'drawers',
        name: 'Gavetas',
      }],
      categories: [{ id: 'category-1', name: 'Cômodas' }],
    });
    let currentProduct: Partial<Product> = {
      categoryIds: ['category-1'],
      selectedCharacteristicIds: [],
      technicalValues: {},
    };
    const setFormData = vi.fn((updater) => {
      currentProduct = typeof updater === 'function' ? updater(currentProduct) : updater;
    });

    const { result } = renderHook(() =>
      useProductTechnicalTab({ formData: currentProduct, setFormData })
    );
    await act(async () => { await Promise.resolve(); });

    act(() => result.current.handleAddCharacteristicFromSearch(fields[1] as any));

    expect(currentProduct.selectedCharacteristicIds).toEqual(['drawer-runner', 'drawer-quantity']);
    expect(currentProduct.activeCharacteristicIds).toEqual(['drawer-runner', 'drawer-quantity']);
    expect(currentProduct.technicalValues).toEqual({
      'Tipo de corrediça': '',
      'Quantidade de gavetas': '',
    });
    expect(currentProduct.selectedCharacteristicIds).not.toContain('drawer-material');
    expect(currentProduct.selectedCharacteristicGroupIds).toBeUndefined();
  });

  it('ativa grupos opcionais que contêm dependências da característica pesquisada', async () => {
    const fields = [
      {
        id: 'base-quantity',
        name: 'Quantidade base',
        groupId: 'base',
        dataType: 'integer',
        options: [],
        categoryIds: ['category-1'],
        active: true,
      },
      {
        id: 'extra-type',
        name: 'Tipo de acessório',
        groupId: 'extras',
        dataType: 'radio',
        options: [],
        categoryIds: ['category-1'],
        dependency: {
          referenceAttributeId: 'base-quantity',
          operator: 'greater_than',
          value: '0',
        },
        active: true,
      },
    ];
    vi.mocked(technicalFieldService.fetchTechnicalFieldDefinitions).mockResolvedValueOnce(fields as any);
    vi.mocked(characteristicGroupService.fetchCharacteristicGroups).mockResolvedValueOnce({
      groups: [
        {
          id: 'base',
          name: 'Base',
        },
        {
          id: 'extras',
          name: 'Acessórios',
        },
      ],
      categories: [{ id: 'category-1', name: 'Cômodas' }],
    });
    let currentProduct: Partial<Product> = {
      categoryIds: ['category-1'],
      selectedCharacteristicIds: [],
      technicalValues: {},
    };
    const setFormData = vi.fn((updater) => {
      currentProduct = typeof updater === 'function' ? updater(currentProduct) : updater;
    });

    const { result } = renderHook(() =>
      useProductTechnicalTab({ formData: currentProduct, setFormData })
    );
    await act(async () => { await Promise.resolve(); });

    act(() => result.current.handleAddCharacteristicGroup('extras', 'Tipo de acessório'));

    expect(currentProduct.selectedCharacteristicIds).toEqual(['extra-type', 'base-quantity']);
    expect(currentProduct.selectedCharacteristicGroupIds).toBeUndefined();
  });

  it('preserva dependências da característica dentro do grupo', async () => {
    vi.mocked(technicalFieldService.fetchTechnicalFieldDefinitions).mockResolvedValueOnce([
      {
        id: 'door-quantity',
        name: 'Quantidade de portas',
        dataType: 'integer',
        options: [],
        groupId: 'doors',
        categoryIds: ['wardrobe'],
        requiredProductCategoryIds: ['wardrobe'],
        active: true,
      },
      {
        id: 'door-opening',
        name: 'Tipo de abertura',
        dataType: 'radio',
        options: [{ id: 'sliding', value: 'Correr' }],
        groupId: 'doors',
        categoryIds: ['wardrobe'],
        dependency: {
          referenceAttributeId: 'door-quantity',
          operator: 'greater_than',
          value: '0',
        },
        active: true,
      },
    ] as any);
    vi.mocked(characteristicGroupService.fetchCharacteristicGroups).mockResolvedValueOnce({
      groups: [{
        id: 'doors',
        name: 'Portas',
      }],
      categories: [{ id: 'wardrobe', name: 'Guarda-roupas' }],
    });
    const setFormData = vi.fn();
    const { result, rerender } = renderHook(
      ({ formData }: { formData: Partial<Product> }) =>
        useProductTechnicalTab({ formData, setFormData }),
      {
        initialProps: {
          formData: {
            categoryIds: ['wardrobe'],
            selectedCharacteristicIds: ['door-opening'],
            activeCharacteristicIds: ['door-opening'],
            technicalValues: { 'Quantidade de portas': 0, 'Tipo de abertura': 'Correr' },
          } as Partial<Product>,
        },
      }
    );
    await act(async () => { await Promise.resolve(); });

    expect(result.current.productGroupSections[0].fields.map((field) => field.name)).toEqual([
      'Quantidade de portas',
    ]);
    rerender({
      formData: {
        categoryIds: ['wardrobe'],
        selectedCharacteristicIds: ['door-opening'],
        activeCharacteristicIds: ['door-opening'],
        technicalValues: { 'Quantidade de portas': 2, 'Tipo de abertura': 'Correr' },
      },
    });
    expect(result.current.productGroupSections[0].fields.map((field) => field.name)).toEqual([
      'Quantidade de portas',
      'Tipo de abertura',
    ]);
  });
});
