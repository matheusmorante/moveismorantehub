import React from 'react';
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ fetchFields: vi.fn() }));

vi.mock('react-native', () => ({
  ActivityIndicator: () => <span>Carregando</span>,
  Modal: ({ children, visible }: { children?: React.ReactNode; visible?: boolean }) =>
    visible ? <div>{children}</div> : null,
  ScrollView: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  StyleSheet: { create: (styles: unknown) => styles, hairlineWidth: 1 },
  Switch: ({
    accessibilityLabel,
    disabled,
    onValueChange,
    value,
  }: {
    accessibilityLabel?: string;
    disabled?: boolean;
    onValueChange?: (value: boolean) => void;
    value?: boolean;
  }) => (
    <input
      aria-label={accessibilityLabel}
      type="checkbox"
      checked={value}
      disabled={disabled}
      onChange={(event) => onValueChange?.(event.target.checked)}
    />
  ),
  Text: ({ children }: { children?: React.ReactNode }) => <span>{children}</span>,
  TextInput: ({
    editable,
    onChangeText,
    placeholder,
    value,
  }: {
    editable?: boolean;
    onChangeText?: (value: string) => void;
    placeholder?: string;
    value?: string;
  }) => (
    <input
      type="text"
      value={value ?? ''}
      placeholder={placeholder}
      disabled={editable === false}
      onChange={(event) => onChangeText?.(event.target.value)}
    />
  ),
  TouchableOpacity: ({
    accessibilityLabel,
    accessibilityRole,
    children,
    disabled,
    onPress,
  }: {
    accessibilityLabel?: string;
    accessibilityRole?: string;
    children?: React.ReactNode;
    disabled?: boolean;
    onPress?: () => void;
  }) => (
    <button
      aria-label={accessibilityLabel}
      role={accessibilityRole}
      disabled={disabled}
      onClick={onPress}
    >
      {children}
    </button>
  ),
  View: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('lucide-react-native', () =>
  Object.fromEntries(
    ['ArrowLeftRight', 'Check', 'Info', 'Link', 'PlusCircle', 'Search', 'Trash2', 'Unlink'].map(
      (name) => [name, () => null]
    )
  )
);

vi.mock('../../../mobile/src/features/products/modals/components/ProductAiCharacteristicsAssistant', () => ({
  ProductAiCharacteristicsAssistant: () => null,
}));

vi.mock('../../../mobile/src/features/products/services/mobileProductTechnicalService', () => ({
  fetchMobileProductTechnicalFields: mocks.fetchFields,
}));

import { ProductFormTechnicalTab } from '../../../mobile/src/features/products/modals/tabs/ProductFormTechnicalTab';
import { ProductTechnicalFieldInput } from '../../../mobile/src/features/products/modals/tabs/ProductTechnicalFieldInput';

const technicalFields = [
  {
    id: 'color',
    name: 'Cor',
    active: true,
    data_type: 'text',
    decimal_places: null,
    unit: null,
    categoryIds: ['category-1'],
    isRequired: false,
    isCustom: true,
    options: [],
  },
  {
    id: 'depth',
    name: 'Profundidade',
    active: true,
    data_type: 'measure',
    decimal_places: 2,
    unit: 'cm',
    categoryIds: ['category-1'],
    isRequired: false,
    isCustom: true,
    options: [],
  },
];

const parentData = {
  categoryIds: ['category-1'],
  technicalValues: { Cor: 'Azul', Profundidade: 60 },
  variableTechnicalFields: ['Cor', 'Profundidade'],
};

const variationData = {
  categoryIds: ['category-1'],
  technicalValues: { Cor: 'Verde', Profundidade: 55 },
  attributes: [
    { name: 'Cor', value: 'Verde' },
    { name: 'Profundidade', value: '55' },
  ],
};

const renderCorOverrideTab = (setFormData: (update: (previous: any) => any) => void) =>
  render(
    <ProductFormTechnicalTab
      formData={{ categoryIds: ['category-1'], technicalValues: {}, attributes: [] }}
      setFormData={setFormData}
      dark={false}
      parentData={{
        categoryIds: ['category-1'],
        technicalValues: { Cor: 'Azul' },
        variableTechnicalFields: ['Cor'],
      }}
      isSingleVariation={false}
    />
  );

const renderTab = (isSingleVariation: boolean) =>
  render(
    <ProductFormTechnicalTab
      formData={variationData}
      setFormData={vi.fn()}
      dark={false}
      parentData={parentData}
      isSingleVariation={isSingleVariation}
    />
  );

const doorFields = [
  {
    id: 'has-doors',
    name: 'Possui portas',
    active: true,
    data_type: 'boolean',
    decimal_places: null,
    unit: null,
    categoryIds: ['category-1'],
    isRequired: false,
    isCustom: true,
    options: [
      { id: 'yes', value: 'Sim', attribute_id: 'has-doors' },
      { id: 'no', value: 'Não', attribute_id: 'has-doors' },
    ],
  },
  {
    id: 'door-type',
    name: 'Tipo de portas',
    active: true,
    data_type: 'text',
    decimal_places: null,
    unit: null,
    categoryIds: ['category-1'],
    isRequired: false,
    isCustom: true,
    options: [],
  },
];

const renderDoorDependencyTab = (hasDoors: boolean) => {
  const dependencyParent = {
    categoryIds: ['category-1'],
    technicalValues: { 'Possui portas': hasDoors ? 'Sim' : 'Não' },
    variableTechnicalFields: ['Possui portas', 'Tipo de portas'],
  };
  return render(
    <ProductFormTechnicalTab
      formData={{
        categoryIds: ['category-1'],
        technicalValues: { 'Tipo de portas': 'MDF' },
        attributes: [{ name: 'Tipo de portas', value: 'MDF' }],
      }}
      setFormData={vi.fn()}
      dark={false}
      parentData={dependencyParent}
      isSingleVariation={false}
    />
  );
};

describe('ProductFormTechnicalTab — edição da variação única', () => {
  afterEach(() => cleanup());

  beforeEach(() => {
    mocks.fetchFields.mockResolvedValue(technicalFields);
  });

  it('bloqueia a edição técnica e não mostra controles extras quando há uma variação', async () => {
    renderTab(true);

    await waitFor(() => expect(screen.getByText('Cor')).toBeInTheDocument());

    expect(screen.getByDisplayValue('Verde')).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'Herdar Cor do produto pai' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Alternar para Comprimento' })).toBeDisabled();
  });

  it('mantém campo e alternância disponíveis sem controles extras em famílias multi-variação', async () => {
    renderTab(false);

    await waitFor(() => expect(screen.getByText('Cor')).toBeInTheDocument());

    expect(screen.getByDisplayValue('Verde')).toBeEnabled();
    expect(screen.queryByRole('button', { name: 'Herdar Cor do produto pai' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Personalizar Cor' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Alternar para Comprimento' })).toBeEnabled();
  });

  it('não preenche do pai uma característica variável sem override próprio', async () => {
    render(
      <ProductFormTechnicalTab
        formData={{ categoryIds: ['category-1'], technicalValues: {}, attributes: [] }}
        setFormData={vi.fn()}
        dark={false}
        parentData={parentData}
        isSingleVariation={false}
      />
    );

    expect(await screen.findByText('Cor')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Informe o valor')).toHaveValue('');
    expect(screen.getByPlaceholderText('Informe o valor')).toBeEnabled();
    expect(screen.queryByRole('button', { name: 'Personalizar Cor' })).toBeNull();
  });

  it('ao limpar um valor próprio, mantém override vazio e remove o atributo compatível', async () => {
    const setFormData = vi.fn();
    render(
      <ProductFormTechnicalTab
        formData={variationData}
        setFormData={setFormData}
        dark={false}
        parentData={parentData}
        isSingleVariation={false}
      />
    );

    fireEvent.change(await screen.findByDisplayValue('Verde'), { target: { value: '' } });

    const update = setFormData.mock.calls.at(-1)?.[0];
    expect(typeof update).toBe('function');
    expect(update(variationData)).toMatchObject({
      technicalValues: { Cor: '', Profundidade: 55 },
      attributes: [{ name: 'Profundidade', value: '55' }],
    });
  });

  it('permite limpar uma opção variável selecionada pelo controle real mobile', async () => {
    const setFormData = vi.fn();
    mocks.fetchFields.mockResolvedValue([
      {
        ...technicalFields[0],
        data_type: 'list',
        options: [
          { id: 'blue', value: 'Azul' },
          { id: 'green', value: 'Verde' },
        ],
      },
      technicalFields[1],
    ]);
    const currentVariation = {
      ...variationData,
      technicalValues: { Cor: 'Verde', Profundidade: 55 },
      attributes: [
        { name: 'Cor', value: 'Verde' },
        { name: 'Profundidade', value: '55' },
      ],
    };

    render(
      <ProductFormTechnicalTab
        formData={currentVariation}
        setFormData={setFormData}
        dark={false}
        parentData={parentData}
        isSingleVariation={false}
      />
    );

    fireEvent.click(await screen.findByRole('button', { name: 'Limpar Cor' }));

    const update = setFormData.mock.calls.at(-1)?.[0];
    expect(update(currentVariation)).toMatchObject({
      technicalValues: { Cor: '', Profundidade: 55 },
      attributes: [{ name: 'Profundidade', value: '55' }],
    });
  });

  it('preserva o comportamento do seletor pesquisável e permite limpar respostas Sim/Não', () => {
    const onChange = vi.fn();
    const options = Array.from({ length: 9 }, (_, index) => ({
      id: `option-${index + 1}`,
      value: `Opção ${index + 1}`,
    }));

    const { rerender } = render(
      <ProductTechnicalFieldInput
        field={{ name: 'Acabamento', data_type: 'list', options }}
        value="Opção 9"
        onChange={onChange}
      />
    );
    expect(screen.queryByRole('button', { name: 'Limpar Acabamento' })).toBeNull();

    onChange.mockClear();
    rerender(
      <ProductTechnicalFieldInput
        field={{ name: 'Possui portas', data_type: 'boolean', options: [] }}
        value={true}
        onChange={onChange}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: 'Limpar Possui portas' }));
    expect(onChange).toHaveBeenCalledWith('');
  });

  it('bloqueia atributo dependente e mostra o motivo quando a condição do pai está desligada', async () => {
    mocks.fetchFields.mockResolvedValue(doorFields);
    renderDoorDependencyTab(false);

    await waitFor(() => expect(screen.getByDisplayValue('MDF')).toBeInTheDocument());

    expect(screen.getByDisplayValue('MDF')).toBeDisabled();
    fireEvent.click(
      screen.getByRole('button', {
        name: 'Disponível apenas quando Possui portas for Sim.',
      })
    );
    expect(
      screen.getByText('Disponível apenas quando Possui portas for Sim.')
    ).toBeInTheDocument();
  });

  it('libera o atributo dependente quando a condição do pai está ativa', async () => {
    mocks.fetchFields.mockResolvedValue(doorFields);
    renderDoorDependencyTab(true);

    await waitFor(() => expect(screen.getByDisplayValue('MDF')).toBeInTheDocument());

    expect(screen.getByDisplayValue('MDF')).toBeEnabled();
    expect(
      screen.queryByRole('button', {
        name: 'Disponível apenas quando Possui portas for Sim.',
      })
    ).toBeNull();
  });

  it('cria novo override de Cor com showName=false como o ERP', async () => {
    let updatedVariation: any = {
      categoryIds: ['category-1'],
      technicalValues: {},
      attributes: [],
    };
    const setFormData = vi.fn((update: (previous: any) => any) => {
      updatedVariation = update(updatedVariation);
    });

    renderCorOverrideTab(setFormData);
    await waitFor(() => expect(screen.getByText('Cor')).toBeInTheDocument());
    const corInput = screen.getByPlaceholderText('Informe o valor');
    expect(corInput).toHaveValue('');
    fireEvent.change(corInput, { target: { value: 'Verde' } });

    expect(updatedVariation.attributes).toEqual([
      { name: 'Cor', value: 'Verde', showName: false },
    ]);
  });
});
