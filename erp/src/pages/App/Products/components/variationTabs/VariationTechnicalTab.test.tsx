// @vitest-environment happy-dom
import '@testing-library/jest-dom/vitest';
import React, { useState } from 'react';
import { fireEvent, render, screen, waitFor, cleanup } from '@testing-library/react';
import { describe, expect, it, vi, afterEach } from 'vitest';
import type Product from '@/pages/types/product.type';
import type { Variation } from '@/pages/types/product.type';
import { VariationTechnicalTab } from './VariationTechnicalTab';
import * as characteristicGroupService from '@/pages/utils/characteristicGroupService';

vi.mock('react-toastify', () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

vi.mock('@/pages/utils/aiService', () => ({
  aiService: {
    improveProductDescription: vi.fn(),
  },
}));

const mockFields = [
  {
    id: 'f-cor',
    name: 'Cor',
    dataType: 'list' as const,
    isRequired: true,
    options: [{ id: '1', value: 'Azul' }],
  },
  {
    id: 'f-prof',
    name: 'Profundidade total',
    dataType: 'measure' as const,
    isRequired: true,
    categoryIds: ['cat-1'],
    options: [],
  },
  {
    id: 'f-comp',
    name: 'Comprimento total',
    dataType: 'measure' as const,
    isRequired: true,
    categoryIds: ['cat-1'],
    options: [],
  },
  {
    id: 'f-portas',
    name: 'Quantidade de portas',
    dataType: 'integer' as const,
    categoryIds: ['cat-1'],
    requiredCategoryIds: ['cat-1'],
    options: [],
  },
  {
    id: 'f-material-portas',
    name: 'Material das portas',
    dataType: 'list' as const,
    categoryIds: ['cat-1'],
    options: [{ id: 'mdf', value: 'MDF' }],
  },
];

vi.mock('../../services/technicalFieldService', () => ({
  fetchTechnicalFieldDefinitions: vi.fn().mockImplementation(() => Promise.resolve(mockFields)),
}));

vi.mock('@/pages/utils/characteristicGroupService', () => ({
  fetchCharacteristicGroups: vi.fn().mockResolvedValue({ groups: [], categories: [] }),
}));

vi.mock('../tabs/technical/TechnicalFieldInput', () => ({
  TechnicalFieldInput: ({ field, value, onChange, disabled }: any) => (
    <input
      data-testid={`input-${field.name}`}
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
    />
  ),
}));

vi.mock('../modals/attributes/AttributeManagementModal', () => ({
  AttributeManagementModal: ({ isOpen }: any) =>
    isOpen ? <div data-testid="attribute-modal">Modal Aberto</div> : null,
}));

const mockParentProduct: Product = {
  id: 'p-1',
  name: 'Guarda-Roupa Master',
  description: '',
  active: true,
  itemType: 'product',
  unitPrice: 2000,
  unit: 'UN',
  categoryIds: ['cat-1'],
  technicalValues: {
    Cor: 'Branco',
    'Profundidade total': '60',
    'Quantidade de portas': '6',
  },
  variableTechnicalFields: [
    'Cor',
    'Profundidade total',
    'Comprimento total',
    'Quantidade de portas',
    'Material das portas',
  ],
  variations: [],
};

const mockVariation: Variation = {
  id: 'v-1',
  name: 'Guarda-Roupa Master Branco',
  sku: 'GRM-BR',
  stock: 5,
  unitPrice: 2000,
  active: true,
  technicalValues: {},
  attributes: [],
};

const TestHarness: React.FC<{
  initialVariation?: Variation;
  initialParentProduct?: Product;
}> = ({ initialVariation = mockVariation, initialParentProduct = mockParentProduct }) => {
  const [formData, setFormData] = useState<Variation>(initialVariation);

  const handleChange = <K extends keyof Variation>(field: K, value: Variation[K]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <>
      <VariationTechnicalTab
        formData={formData}
        parentProduct={initialParentProduct}
        handleChange={handleChange}
        initialTechnicalFields={mockFields}
      />
      <output data-testid="variation-data">{JSON.stringify(formData)}</output>
    </>
  );
};

describe('VariationTechnicalTab', () => {
  afterEach(() => {
    cleanup();
  });

  it('renderiza característica variável sem valor próprio e permite editá-la', async () => {
    render(<TestHarness />);

    // Espera os campos carregarem
    await waitFor(() => {
      expect(screen.getByText('Cor')).toBeInTheDocument();
      expect(screen.getByText('Profundidade total')).toBeInTheDocument();
    });

    // Esta aba edita apenas o valor próprio; valor variável ausente começa vazio.
    const corInput = screen.getByTestId('input-Cor') as HTMLInputElement;
    expect(corInput.value).toBe('');
    expect(corInput).not.toBeDisabled();
    expect(screen.queryByTitle(/Sincronizado com o pai|Manual — clique para sincronizar/)).toBeNull();
  });

  it('mantém a característica obrigatória visível e oculta dependentes sem quantidade própria', async () => {
    render(<TestHarness />);

    await waitFor(() => {
      expect(screen.getByTestId('input-Quantidade de portas')).toBeInTheDocument();
    });

    expect((screen.getByTestId('input-Quantidade de portas') as HTMLInputElement).value).toBe('');
    expect(screen.queryByTestId('input-Material das portas')).toBeNull();
  });

  it('mostra a característica opcional ativada individualmente sem depender do estado do grupo', async () => {
    const groupField = {
      id: 'door-quantity',
      name: 'Quantidade de portas',
      dataType: 'integer' as const,
      groupId: 'doors',
      categoryIds: ['cat-1'],
      options: [],
    };
    vi.mocked(characteristicGroupService.fetchCharacteristicGroups).mockResolvedValueOnce({
      groups: [{
        id: 'doors',
        name: 'Portas',
      }],
      categories: [{ id: 'cat-1', name: 'Guarda-roupas' }],
    });
    render(
      <TestHarness
        initialParentProduct={{
          ...mockParentProduct,
          selectedCharacteristicIds: ['door-quantity'],
          activeCharacteristicIds: ['door-quantity'],
          variableTechnicalFields: ['Quantidade de portas'],
        }}
      />
    );

    expect(await screen.findByTestId('input-Quantidade de portas')).toBeInTheDocument();
    expect(screen.getByTestId('input-Quantidade de portas')).toBeEnabled();
  });

  it('marca somente a característica individualmente obrigatória dentro do grupo', async () => {
    const groupField = {
      id: 'door-quantity',
      name: 'Quantidade de portas',
      dataType: 'integer' as const,
      groupId: 'doors',
      categoryIds: ['cat-1'],
      requiredProductCategoryIds: ['cat-1'],
      options: [],
    };
    vi.mocked(characteristicGroupService.fetchCharacteristicGroups).mockResolvedValueOnce({
      groups: [{
        id: 'doors',
        name: 'Portas',
      }],
      categories: [{ id: 'cat-1', name: 'Guarda-roupas' }],
    });
    render(
      <VariationTechnicalTab
        formData={mockVariation}
        parentProduct={{
          ...mockParentProduct,
          selectedCharacteristicIds: [],
          activeCharacteristicIds: [],
          variableTechnicalFields: ['Quantidade de portas'],
        }}
        handleChange={vi.fn()}
        initialTechnicalFields={[groupField]}
      />
    );

    expect(await screen.findByTestId('input-Quantidade de portas')).toBeDefined();
    expect(screen.getByText('Quantidade de portas').closest('label')?.querySelector('[aria-label="Obrigatória"]')).toBeNull();
    expect(screen.queryByRole('switch', { name: 'Exibir característica Quantidade de portas' })).toBeNull();
  });

  it('preserva zero na característica e limpa dependentes ao zerar a quantidade por variação', async () => {
    const variation: Variation = {
      ...mockVariation,
      technicalValues: { 'Quantidade de portas': '2', 'Material das portas': 'MDF' },
      attributes: [
        { name: 'Quantidade de portas', value: '2' },
        { name: 'Material das portas', value: 'MDF' },
      ],
    };
    render(<TestHarness initialVariation={variation} />);

    await waitFor(() => expect(screen.getByTestId('input-Material das portas')).toBeInTheDocument());
    fireEvent.change(screen.getByTestId('input-Quantidade de portas'), { target: { value: '0' } });

    await waitFor(() => expect(screen.queryByTestId('input-Material das portas')).toBeNull());
    const updated = JSON.parse(screen.getByTestId('variation-data').textContent || '{}') as Variation;
    expect(updated.technicalValues).toMatchObject({
      'Quantidade de portas': '0',
      'Material das portas': '',
    });
    expect(updated.attributes).toContainEqual(
      expect.objectContaining({ name: 'Quantidade de portas', value: '0' })
    );
    expect(updated.attributes).not.toContainEqual(
      expect.objectContaining({ name: 'Material das portas' })
    );
  });

  it('avalia condição configurada usando a quantidade variável da própria variação', async () => {
    const quantity = {
      id: 'door-quantity',
      name: 'Quantidade de portas',
      dataType: 'integer' as const,
      groupId: 'doors',
      categoryIds: ['cat-1'],
      options: [],
    };
    const opening = {
      id: 'door-opening',
      name: 'Tipo de abertura',
      dataType: 'radio' as const,
      groupId: 'doors',
      categoryIds: ['cat-1'],
      options: [{ id: 'sliding', value: 'Correr' }],
      dependency: {
        referenceAttributeId: quantity.id,
        operator: 'greater_than' as const,
        value: '1',
      },
    };
    const parentProduct = {
      ...mockParentProduct,
      selectedCharacteristicIds: [quantity.id, opening.id],
      activeCharacteristicIds: [quantity.id, opening.id],
      variableTechnicalFields: [quantity.name, opening.name],
      technicalValues: { ...mockParentProduct.technicalValues, [quantity.name]: '' },
    };
    const variation: Variation = {
      ...mockVariation,
      technicalValues: { [quantity.name]: '1' },
    };
    render(
      <VariationTechnicalTab
        formData={variation}
        parentProduct={parentProduct}
        handleChange={vi.fn()}
        initialTechnicalFields={[quantity, opening]}
      />
    );

    await waitFor(() => expect(screen.getByTestId(`input-${quantity.name}`)).toBeInTheDocument());
    expect(screen.queryByTestId(`input-${opening.name}`)).toBeNull();
  });

  it('cria override de Cor sem incluir o valor no nome automático', async () => {
    const handleChange = vi.fn();
    render(
      <VariationTechnicalTab
        formData={mockVariation}
        parentProduct={mockParentProduct}
        handleChange={handleChange}
        initialTechnicalFields={mockFields}
      />
    );

    await waitFor(() => expect(screen.getByTestId('input-Cor')).toBeInTheDocument());
    fireEvent.change(screen.getByTestId('input-Cor'), { target: { value: 'Azul' } });

    expect(handleChange).toHaveBeenCalledWith('attributes', [
      { name: 'Cor', value: 'Azul', showName: false },
    ]);
  });

  it('preserva showName existente ao editar o override de Cor', async () => {
    const handleChange = vi.fn();
    const variation: Variation = {
      ...mockVariation,
      technicalValues: { Cor: 'Branco' },
      attributes: [{ name: 'Cor', value: 'Branco', showName: true }],
    };
    render(
      <VariationTechnicalTab
        formData={variation}
        parentProduct={mockParentProduct}
        handleChange={handleChange}
        initialTechnicalFields={mockFields}
      />
    );

    await waitFor(() => expect(screen.getByTestId('input-Cor')).toBeInTheDocument());
    fireEvent.change(screen.getByTestId('input-Cor'), { target: { value: 'Azul' } });

    expect(handleChange).toHaveBeenCalledWith('attributes', [
      { name: 'Cor', value: 'Azul', showName: true },
    ]);
  });

  it('ao limpar um valor próprio, mantém override vazio e remove o atributo compatível', async () => {
    const handleChange = vi.fn();
    const variation: Variation = {
      ...mockVariation,
      technicalValues: { Cor: 'Branco' },
      attributes: [{ name: 'Cor', value: 'Branco', showName: true }],
    };
    render(
      <VariationTechnicalTab
        formData={variation}
        parentProduct={mockParentProduct}
        handleChange={handleChange}
        initialTechnicalFields={mockFields}
      />
    );

    await waitFor(() => expect(screen.getByTestId('input-Cor')).toBeInTheDocument());
    fireEvent.change(screen.getByTestId('input-Cor'), { target: { value: '' } });

    expect(handleChange).toHaveBeenNthCalledWith(1, 'technicalValues', { Cor: '' });
    expect(handleChange).toHaveBeenNthCalledWith(2, 'attributes', []);
  });

  it('oculta características fixas na aba da variação mesmo que haja um valor legado', async () => {
    const parentProduct = { ...mockParentProduct, variableTechnicalFields: [] };
    const variation = {
      ...mockVariation,
      technicalValues: { Cor: 'Azul' },
      attributes: [{ name: 'Cor', value: 'Azul' }],
    };
    const handleChange = vi.fn();

    render(
      <VariationTechnicalTab
        formData={variation}
        parentProduct={parentProduct}
        handleChange={handleChange}
        initialTechnicalFields={mockFields}
      />
    );

    await waitFor(() => expect(screen.getByText('Características específicas')).toBeInTheDocument());
    expect(screen.queryByText('Cor')).toBeNull();
  });

  it('não trata campo dependente como variável quando só ele está marcado, sem a mestre', async () => {
    const parentProduct = {
      ...mockParentProduct,
      variableTechnicalFields: ['Material das portas'],
    };

    render(
      <VariationTechnicalTab
        formData={mockVariation}
        parentProduct={parentProduct}
        handleChange={vi.fn()}
        initialTechnicalFields={mockFields}
      />
    );

    await waitFor(() =>
      expect(screen.getByText('Características específicas')).toBeInTheDocument()
    );
    expect(screen.queryByTestId('input-Material das portas')).toBeNull();
  });

  it('abre o modal de gerenciamento de cor ao clicar em Gerenciar', async () => {
    render(<TestHarness />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /gerenciar cores/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /gerenciar cores/i }));

    expect(screen.getByTestId('attribute-modal')).toBeInTheDocument();
  });
});
