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

describe('ProductTechnicalTab field applicability', () => {
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
    expect(screen.getByText('Quantidade de portas').closest('label')?.querySelector('[aria-label="Obrigatória"]')).toBeNull();
    const search = screen.getByRole('searchbox');
    const requiredHeading = screen.getByRole('heading', { name: /Características adicionadas/ });
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
});
