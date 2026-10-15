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
    ] as any);

    render(
      <ProductTechnicalTab
        formData={{ technicalValues: { Altura: '100', Largura: '200' } }}
        setFormData={vi.fn()}
      />
    );

    expect(await screen.findByText('Características principais')).toBeDefined();
    expect(screen.getByText('Altura')).toBeDefined();
    expect(screen.getByText('Largura')).toBeDefined();
    expect(screen.getByRole('searchbox')).toBeDefined();
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
});
