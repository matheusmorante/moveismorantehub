// @vitest-environment happy-dom
import '@testing-library/jest-dom/vitest';
import React, { useState } from 'react';
import { fireEvent, render, screen, waitFor, cleanup } from '@testing-library/react';
import { describe, expect, it, vi, afterEach } from 'vitest';
import type Product from '@/pages/types/product.type';
import type { Variation } from '@/pages/types/product.type';
import { VariationTechnicalTab } from './VariationTechnicalTab';

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
    options: [],
  },
];

vi.mock('../../services/technicalFieldService', () => ({
  fetchTechnicalFieldDefinitions: vi.fn().mockImplementation(() => Promise.resolve(mockFields)),
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
  unitPrice: 2000,
  unit: 'UN',
  categoryIds: ['cat-1'],
  technicalValues: {
    Cor: 'Branco',
    'Profundidade total': '60',
    'Quantidade de portas': '6',
  },
  variations: [],
};

const mockVariation: Variation = {
  id: 'v-1',
  name: 'Guarda-Roupa Master Branco',
  sku: 'GRM-BR',
  stock: 5,
  unitPrice: 2000,
  technicalValues: {},
  attributes: [],
};

const TestHarness: React.FC = () => {
  const [formData, setFormData] = useState<Variation>(mockVariation);

  const handleChange = <K extends keyof Variation>(field: K, value: Variation[K]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <VariationTechnicalTab
      formData={formData}
      parentProduct={mockParentProduct}
      handleChange={handleChange}
      initialTechnicalFields={mockFields}
    />
  );
};

describe('VariationTechnicalTab', () => {
  afterEach(() => {
    cleanup();
  });

  it('carrega e renderiza os campos agrupados da variação', async () => {
    render(<TestHarness />);

    // Espera os campos carregarem
    await waitFor(() => {
      expect(screen.getByText('Cor')).toBeInTheDocument();
      expect(screen.getByText('Profundidade total')).toBeInTheDocument();
    });

    // Campo herdado do pai
    const corInput = screen.getByTestId('input-Cor') as HTMLInputElement;
    expect(corInput.value).toBe('Branco');
    expect(corInput).toBeDisabled();
  });

  it('permite alternar entre Profundidade total e Comprimento total', async () => {
    render(<TestHarness />);

    await waitFor(() => {
      expect(screen.getByText('Profundidade total')).toBeInTheDocument();
    });

    const toggleBtn = screen.getByTitle('Alternar para Comprimento total');
    fireEvent.click(toggleBtn);

    await waitFor(() => {
      expect(screen.getByText('Comprimento total')).toBeInTheDocument();
    });
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
