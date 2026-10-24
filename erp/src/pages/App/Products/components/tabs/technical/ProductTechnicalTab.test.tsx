// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import React from 'react';
import { ProductTechnicalTab } from './ProductTechnicalTab';
import * as technicalFieldService from '../../../services/technicalFieldService';

vi.mock('../../../services/technicalFieldService', () => ({
  fetchTechnicalFieldDefinitions: vi.fn(),
}));

vi.mock('../../modals/attributes/AttributeManagementModal', () => ({
  AttributeManagementModal: () => null,
}));

describe('ProductTechnicalTab Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
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
      { id: '3', name: 'Peso', isRequired: false, active: true, group: 'Dimensões' },
    ] as any);

    render(
      <ProductTechnicalTab
        formData={{ technicalValues: { Altura: '100', Largura: '200', Peso: '10' } }}
        setFormData={vi.fn()}
      />
    );

    expect(
      await screen.findByRole('heading', { name: 'Características principais' })
    ).toBeDefined();
    const dimensionsHeading = screen.getByText('Dimensões e Peso');
    expect(dimensionsHeading.closest('details')).not.toBeNull();
    expect(
      screen
        .getByRole('heading', { name: 'Características principais' })
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

