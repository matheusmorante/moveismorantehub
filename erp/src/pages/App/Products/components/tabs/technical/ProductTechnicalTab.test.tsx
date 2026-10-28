// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { ProductTechnicalTab } from './ProductTechnicalTab';
import * as technicalFieldService from '../../../services/technicalFieldService';
import * as characteristicGroupService from '@/pages/utils/characteristicGroupService';

vi.mock('../../../services/technicalFieldService', () => ({
  fetchTechnicalFieldDefinitions: vi.fn(),
}));

vi.mock('@/pages/utils/characteristicGroupService', () => ({
  fetchCharacteristicGroups: vi.fn(),
}));

vi.mock('../../modals/attributes/AttributeManagementModal', () => ({
  AttributeManagementModal: () => null,
}));

describe('ProductTechnicalTab Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(characteristicGroupService.fetchCharacteristicGroups).mockResolvedValue({
      groups: [],
      categories: [],
    });
  });

  afterEach(() => {
    cleanup();
  });

  it('mostra uma condição alternativa quando há gavetas mesmo com zero portas', async () => {
    vi.mocked(characteristicGroupService.fetchCharacteristicGroups).mockResolvedValueOnce({
      groups: [{ id: 'hardware', name: 'Ferragens' }], categories: [],
    });
    const required = [{ categoryId: 'cat', application: 'required' as const }];
    vi.mocked(technicalFieldService.fetchTechnicalFieldDefinitions).mockResolvedValue([
      { id: 'doors', name: 'Quantidade de portas', dataType: 'integer', options: [], groupId: 'hardware', categoryApplications: required },
      { id: 'drawers', name: 'Quantidade de gavetas', dataType: 'integer', options: [], groupId: 'hardware', categoryApplications: required },
      { id: 'handle', name: 'Tipo(s) de puxador', dataType: 'radio', options: [], groupId: 'hardware', categoryApplications: required,
        dependency: { referenceAttributeId: 'doors', operator: 'greater_than', value: '0' },
        dependencyAlternatives: [{ referenceAttributeId: 'drawers', operator: 'greater_than', value: '0' }] },
    ]);
    const setFormData = vi.fn();
    const view = render(<ProductTechnicalTab formData={{ categoryIds: ['cat'], technicalValues: {
      'Quantidade de portas': 0, 'Quantidade de gavetas': 2,
    } }} setFormData={setFormData} />);
    expect(await screen.findByText('Tipo(s) de puxador')).toBeDefined();
    view.rerender(<ProductTechnicalTab formData={{ categoryIds: ['cat'], technicalValues: {
      'Quantidade de portas': 0, 'Quantidade de gavetas': 0,
    } }} setFormData={setFormData} />);
    await waitFor(() => expect(screen.queryByText('Tipo(s) de puxador')).toBeNull());
  });

  it('renderiza o indicador de carregamento inicialmente', () => {
    vi.mocked(technicalFieldService.fetchTechnicalFieldDefinitions).mockReturnValue(
      new Promise(() => {}) // never resolving to test loading state
    );

    render(
      <ProductTechnicalTab
        formData={{ technicalValues: {} }}
        setFormData={vi.fn()}
      />
    );

    expect(screen.getByText(/carregando especificações técnicas.../i)).toBeDefined();
  });

  it('renderiza os campos técnicos e o controle de pesquisa quando carregados', async () => {
    vi.mocked(technicalFieldService.fetchTechnicalFieldDefinitions).mockResolvedValue([
      { id: '1', name: 'Altura', isRequired: true, active: true, group: 'Dimensões' },
      { id: '2', name: 'Largura', isRequired: true, active: true, group: 'Dimensões' },
      { id: '3', name: 'Peso', isRequired: true, active: true, group: 'Dimensões' },
    ] as any);

    render(
      <ProductTechnicalTab
        formData={{ technicalValues: { Altura: '100', Largura: '200', Peso: '10' } }}
        setFormData={vi.fn()}
      />
    );

    expect(
      await screen.findByRole('heading', { name: /Obrigatórias/ })
    ).toBeDefined();
    const dimensionsHeading = screen.getByText('Dimensões e Peso');
    expect(dimensionsHeading.closest('section')).not.toBeNull();
    expect(
      screen
        .getByRole('heading', { name: /Obrigatórias/ })
        .closest('section')
        ?.contains(dimensionsHeading)
    ).toBe(true);
    expect(screen.getByText('Altura')).toBeDefined();
    expect(screen.getByText('Largura')).toBeDefined();
    expect(screen.getByText('Peso')).toBeDefined();
    expect(screen.getByRole('searchbox')).toBeDefined();
  });

  it('usa quantidade zero como ausência e oculta os campos mestre e dependentes de portas', async () => {
    vi.mocked(technicalFieldService.fetchTechnicalFieldDefinitions).mockResolvedValue([
      {
        id: 'door-master',
        name: 'Possui portas',
        dataType: 'radio',
        options: [{ id: 'yes', value: 'Sim' }, { id: 'no', value: 'Não' }],
        categoryIds: ['wardrobe'],
        isRequired: false,
        active: true,
      },
      {
        id: 'door-quantity',
        name: 'Quantidade de portas',
        dataType: 'integer',
        options: [],
        categoryIds: ['wardrobe'],
        requiredCategoryIds: ['wardrobe'],
        isRequired: false,
        active: true,
      },
      {
        id: 'door-type',
        name: 'Tipo de portas',
        dataType: 'multi_select',
        options: [{ id: 'sliding', value: 'De correr' }],
        categoryIds: ['wardrobe'],
        isRequired: false,
        active: true,
      },
      {
        id: 'door-material',
        name: 'Material das portas',
        dataType: 'radio',
        options: [{ id: 'mdf', value: 'MDF' }],
        categoryIds: ['wardrobe'],
        isRequired: false,
        active: true,
      },
    ] as any);

    render(
      <ProductTechnicalTab
        formData={{
          categoryIds: ['wardrobe'],
          technicalValues: {
            'Possui portas': 'Sim',
            'Quantidade de portas': 0,
            'Tipo de portas': 'De correr',
            'Material das portas': 'MDF',
          },
        }}
        setFormData={vi.fn()}
      />
    );

    expect(await screen.findByText('Quantidade de portas')).toBeDefined();
    expect(screen.queryByText('Possui portas')).toBeNull();
    expect(screen.queryByText('Tipo de portas')).toBeNull();
    expect(screen.queryByText('Material das portas')).toBeNull();
    const quantityInput = screen.getByPlaceholderText(
      'Insira a quantidade de portas'
    ) as HTMLInputElement;
    expect(quantityInput.value).toBe('0');
    expect(quantityInput.min).toBe('0');
    expect(quantityInput.disabled).toBe(false);
  });

  it.each([
    ['Tampos', 'Material do Tampo', 'radio'],
    ['Poltronas', 'Profundidade fechado', 'measure'],
  ])('respeita a aplicação obrigatória de %s para %s', async (categoryName, name, dataType) => {
    vi.mocked(characteristicGroupService.fetchCharacteristicGroups).mockResolvedValue({
      groups: [{ id: 'group-1', name: 'Características' }],
      categories: [],
    });
    vi.mocked(technicalFieldService.fetchTechnicalFieldDefinitions).mockResolvedValue([
      {
        id: 'configured-field',
        name,
        dataType,
        options: [],
        groupId: 'group-1',
        categoryIds: ['category-1'],
        categoryApplications: [{ categoryId: 'category-1', application: 'required' }],
        active: true,
      },
    ] as any);
    render(
      <ProductTechnicalTab
        categoryName={categoryName}
        formData={{ categoryIds: ['category-1'], technicalValues: {} }}
        setFormData={vi.fn()}
      />
    );
    expect(await screen.findByText(name)).toBeDefined();
    expect(screen.getByText(name).closest('label')?.querySelector('[aria-label="Obrigatória"]')).not.toBeNull();
  });

  it('mantém a característica opcional fora do formulário até ativá-la na pesquisa', async () => {
    vi.mocked(technicalFieldService.fetchTechnicalFieldDefinitions).mockResolvedValueOnce([
      {
        id: 'door-quantity',
        name: 'Quantidade de portas',
        dataType: 'integer',
        options: [],
        groupId: 'doors',
        categoryIds: ['wardrobe'],
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

    render(
      <ProductTechnicalTab
        formData={{
          categoryIds: ['wardrobe'],
          technicalValues: {},
        }}
        setFormData={vi.fn()}
      />
    );

    fireEvent.change(await screen.findByRole('searchbox'), { target: { value: 'Portas' } });
    const featureSwitch = await screen.findByRole('switch', { name: 'Ativar característica Quantidade de portas' });
    expect(featureSwitch.getAttribute('aria-checked')).toBe('false');
    expect(screen.queryByRole('switch', { name: 'Ativar grupo Portas' })).toBeNull();
    expect(document.getElementById('technical-field-Quantidade de portas')).toBeNull();
  });

  it('exibe características obrigatórias automaticamente, sem switch de grupo', async () => {
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
    ] as any);
    vi.mocked(characteristicGroupService.fetchCharacteristicGroups).mockResolvedValueOnce({
      groups: [{
        id: 'doors',
        name: 'Portas',
      }],
      categories: [{ id: 'wardrobe', name: 'Guarda-roupas' }],
    });

    render(
      <ProductTechnicalTab
        formData={{
          categoryIds: ['wardrobe'],
          technicalValues: {},
        }}
        setFormData={vi.fn()}
      />
    );

    expect(screen.queryByRole('switch', { name: 'Ativar grupo Portas' })).toBeNull();
    expect(await screen.findByText('Quantidade de portas')).toBeDefined();
    const doorsInput = screen.getByPlaceholderText('Insira a quantidade de portas') as HTMLInputElement;
    expect(doorsInput.min).toBe('0');
    expect(doorsInput.value).toBe('');
    expect(screen.getByText('Quantidade de portas').closest('label')?.querySelector('[aria-label="Obrigatória"]')).not.toBeNull();
    const title = screen.getByRole('heading', { name: 'Características' });
    const search = screen.getByRole('searchbox');
    const requiredHeading = screen.getByRole('heading', { name: /Obrigatórias/ });
    expect(title.compareDocumentPosition(search) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(search.compareDocumentPosition(requiredHeading) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('mostra apenas as características adicionadas e permite ativar cada opcionalmente', async () => {
    vi.mocked(technicalFieldService.fetchTechnicalFieldDefinitions).mockResolvedValueOnce([
      {
        id: 'drawer-quantity',
        name: 'Quantidade de gavetas',
        dataType: 'integer',
        options: [],
        groupId: 'drawers',
        categoryIds: ['dressers'],
        active: true,
      },
      {
        id: 'drawer-material',
        name: 'Material das gavetas',
        dataType: 'radio',
        options: [{ id: 'mdf', value: 'MDF' }],
        groupId: 'drawers',
        categoryIds: ['dressers'],
        active: true,
      },
    ] as any);
    vi.mocked(characteristicGroupService.fetchCharacteristicGroups).mockResolvedValueOnce({
      groups: [{
        id: 'drawers',
        name: 'Gavetas',
      }],
      categories: [{ id: 'dressers', name: 'Cômodas' }],
    });

    render(
      <ProductTechnicalTab
        formData={{
          categoryIds: ['dressers'],
          selectedCharacteristicIds: ['drawer-quantity'],
          activeCharacteristicIds: ['drawer-quantity'],
          technicalValues: { 'Quantidade de gavetas': 1 },
        }}
        setFormData={vi.fn()}
        categoryName="Cômodas"
      />
    );

    expect(await screen.findByText('Quantidade de gavetas')).toBeDefined();
    expect(screen.queryByText('Material das gavetas')).toBeNull();
    expect(screen.getByRole('switch', { name: 'Ativar característica Quantidade de gavetas' })).toBeDefined();
    expect(screen.queryByRole('switch', { name: 'Ativar grupo Gavetas' })).toBeNull();
    expect(screen.getAllByRole('switch')).toHaveLength(1);
  });

  it('não trata características opcionais como obrigatórias só por pertencerem a um grupo', async () => {
    vi.mocked(technicalFieldService.fetchTechnicalFieldDefinitions).mockResolvedValueOnce([
      {
        id: 'drawer-quantity',
        name: 'Quantidade de gavetas',
        dataType: 'integer',
        options: [],
        groupId: 'drawers',
        categoryIds: ['dressers'],
        active: true,
      },
    ] as any);
    vi.mocked(characteristicGroupService.fetchCharacteristicGroups).mockResolvedValueOnce({
      groups: [{
        id: 'drawers',
        name: 'Gavetas',
      }],
      categories: [{ id: 'dressers', name: 'Cômodas' }],
    });

    render(
      <ProductTechnicalTab
        formData={{
          categoryIds: ['dressers'],
          technicalValues: {},
        }}
        setFormData={vi.fn()}
        requiredFieldsOnly
        categoryName="Cômodas"
      />
    );

    await waitFor(() => expect(screen.queryByText('Quantidade de gavetas')).toBeNull());
  });

  it('mostra a categoria, a pendência de preenchimento e permite recolher grupos obrigatórios', async () => {
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
    ] as any);
    vi.mocked(characteristicGroupService.fetchCharacteristicGroups).mockResolvedValueOnce({
      groups: [{
        id: 'doors',
        name: 'Portas',
      }],
      categories: [{ id: 'wardrobe', name: 'Guarda-roupas' }],
    });

    render(
      <ProductTechnicalTab
        formData={{ categoryIds: ['wardrobe'], hasVariations: true, technicalValues: {} }}
        setFormData={vi.fn()}
        categoryName="Guarda-roupas"
      />
    );

    expect(await screen.findByText('Categoria: Guarda-roupas')).toBeDefined();
    expect(screen.getByText('0 de 1 preenchidas')).toBeDefined();
    expect(screen.queryByText('Simples')).toBeNull();
    expect(screen.queryByText('Com variações')).toBeNull();

    const groupButton = screen.getByRole('button', { name: 'Portas' });
    const fieldsId = groupButton.getAttribute('aria-controls');
    expect(groupButton.getAttribute('aria-expanded')).toBe('true');
    expect(document.getElementById(fieldsId!)?.hasAttribute('hidden')).toBe(false);

    fireEvent.click(groupButton);
    expect(groupButton.getAttribute('aria-expanded')).toBe('false');
    expect(document.getElementById(fieldsId!)?.hasAttribute('hidden')).toBe(true);
  });

  it('expande e destaca uma característica existente encontrada pela pesquisa, sem duplicá-la', async () => {
    vi.mocked(technicalFieldService.fetchTechnicalFieldDefinitions).mockResolvedValueOnce([
      {
        id: 'door-quantity',
        name: 'Quantidade de portas',
        dataType: 'integer',
        options: [],
        groupId: 'doors',
        categoryIds: ['wardrobe'],
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

    render(
      <ProductTechnicalTab
        formData={{
          categoryIds: ['wardrobe'],
          selectedCharacteristicIds: ['door-quantity'],
          activeCharacteristicIds: ['door-quantity'],
          technicalValues: {},
        }}
        setFormData={vi.fn()}
        categoryName="Guarda-roupas"
      />
    );

    const groupButton = await screen.findByRole('button', { name: 'Portas' });
    fireEvent.click(groupButton);
    expect(groupButton.getAttribute('aria-expanded')).toBe('false');

    fireEvent.change(screen.getByRole('searchbox'), {
      target: { value: 'Quantidade de portas' },
    });
    fireEvent.click(await screen.findByRole('button', {
      name: 'Localizar característica Quantidade de portas',
    }));

    expect(groupButton.getAttribute('aria-expanded')).toBe('true');
    const field = document.getElementById('technical-field-Quantidade de portas');
    expect(field?.className).toContain('bg-amber-50');
    expect(document.querySelectorAll('[id="technical-field-Quantidade de portas"]')).toHaveLength(1);
  });

  it('exibe mensagem amigável quando requiredFieldsOnly está ativo e não há campos visíveis', async () => {
    vi.mocked(technicalFieldService.fetchTechnicalFieldDefinitions).mockResolvedValue([]);

    render(
      <ProductTechnicalTab
        formData={{ technicalValues: {} }}
        setFormData={vi.fn()}
        requiredFieldsOnly={true}
      />
    );

    expect(
      await screen.findByText(/nenhuma especificação técnica cadastrada no sistema/i)
    ).toBeDefined();
  });

  it('não exibe botões de preenchimento com IA na aba de características (migrados para aba inicial)', () => {
    vi.mocked(technicalFieldService.fetchTechnicalFieldDefinitions).mockResolvedValue([]);

    render(
      <ProductTechnicalTab
        formData={{ technicalValues: {} }}
        setFormData={vi.fn()}
        isAdministrator={true}
      />
    );

    expect(screen.queryByRole('button', { name: /Preencher Características com IA/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /Aperfeiçoar com IA/i })).toBeNull();
  });
});

