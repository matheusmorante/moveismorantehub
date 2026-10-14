// @vitest-environment happy-dom
import '@testing-library/jest-dom/vitest';
import type React from 'react';
import { useState } from 'react';
import { fireEvent, render, screen, cleanup, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, afterEach } from 'vitest';
import type { Product, Variation } from '@/pages/types/product.type';
import { VariationDescriptionTab } from './VariationDescriptionTab';
import { aiService } from '@/pages/utils/aiService';

vi.mock('react-toastify', () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

vi.mock('@/pages/utils/aiService', () => ({
  aiService: {
    improveProductDescription: vi.fn(),
  },
}));

const mockParent: Product = {
  id: 'parent-1',
  name: 'Mesa de Jantar Madeira',
  description: 'Mesa de jantar de madeira maciça, acabamento fosco.',
  unitPrice: 1000,
  unit: 'UN',
  itemType: 'product',
  active: true,
  variations: [],
};

const initialVariation: Variation = {
  id: 'var-1',
  name: 'Mesa de Jantar Madeira 6 Lugares',
  sku: 'MESA-01',
  stock: 10,
  unitPrice: 1000,
  active: true,
  syncDescription: true,
  description: '',
  attributes: [],
};

interface TestHarnessProps {
  parent?: Product;
  initial?: Variation;
  isSingle?: boolean;
  showAiImprove?: boolean;
}

const TestHarness: React.FC<TestHarnessProps> = ({
  parent = mockParent,
  initial = initialVariation,
  isSingle = false,
  showAiImprove = false,
}) => {
  const [formData, setFormData] = useState<Variation | null>(initial);

  const handleChange = <K extends keyof Variation>(field: K, value: Variation[K]) => {
    setFormData((prev) => (prev ? { ...prev, [field]: value } : null));
  };

  if (!formData) return null;

  return (
    <>
      <output data-testid="sync-state">{String(formData.syncDescription)}</output>
      <output data-testid="description-state">{formData.description || ''}</output>
      <VariationDescriptionTab
        formData={formData}
        setFormData={setFormData}
        parentProduct={parent}
        handleChange={handleChange}
        isSingleVariation={isSingle}
        showAiImprove={showAiImprove}
      />
    </>
  );
};

afterEach(cleanup);

describe('VariationDescriptionTab - Herança e personalização de descrição', () => {
  it('exibe a descrição do pai desabilitada e botão "Descrição Herdada do Pai" quando syncDescription for true', () => {
    render(<TestHarness />);

    const inheritButton = screen.getByRole('button', { name: /descrição herdada do pai/i });
    expect(inheritButton).toBeInTheDocument();

    const textarea = screen.getByRole('textbox', { name: /descrição da variação/i });
    expect(textarea).toBeDisabled();
    expect(textarea).toHaveValue('Mesa de jantar de madeira maciça, acabamento fosco.');
  });

  it('permite alternar para "Descrição Personalizada", habilitando edição e mantendo o texto inicial herdado', () => {
    render(<TestHarness />);

    const inheritButton = screen.getByRole('button', { name: /descrição herdada do pai/i });
    fireEvent.click(inheritButton);

    expect(screen.getByTestId('sync-state')).toHaveTextContent('false');
    const customButton = screen.getByRole('button', { name: /descrição personalizada/i });
    expect(customButton).toBeInTheDocument();

    const textarea = screen.getByRole('textbox', { name: /descrição da variação/i });
    expect(textarea).not.toBeDisabled();

    fireEvent.change(textarea, { target: { value: 'Versão especial para 6 pessoas.' } });
    expect(screen.getByTestId('description-state')).toHaveTextContent(
      'Versão especial para 6 pessoas.'
    );
  });

  it('permite voltar para "Descrição Herdada do Pai", desabilitando o campo e restaurando o texto do produto pai', () => {
    render(
      <TestHarness
        initial={{
          ...initialVariation,
          syncDescription: false,
          description: 'Texto customizado antigo',
        }}
      />
    );

    const customButton = screen.getByRole('button', { name: /descrição personalizada/i });
    fireEvent.click(customButton);

    expect(screen.getByTestId('sync-state')).toHaveTextContent('true');
    expect(screen.getByTestId('description-state')).toHaveTextContent(
      'Mesa de jantar de madeira maciça, acabamento fosco.'
    );

    const textarea = screen.getByRole('textbox', { name: /descrição da variação/i });
    expect(textarea).toBeDisabled();
    expect(textarea).toHaveValue('Mesa de jantar de madeira maciça, acabamento fosco.');
  });

  it('bloqueia alternância quando o produto possui variação única (isSingleVariation: true)', () => {
    render(<TestHarness isSingle={true} />);

    const inheritButton = screen.getByRole('button', { name: /descrição herdada do pai/i });
    expect(inheritButton).toBeDisabled();

    const textarea = screen.getByRole('textbox', { name: /descrição da variação/i });
    expect(textarea).toBeDisabled();
  });

  it('não exibe o botão de aperfeiçoar com IA por padrão quando ocultado', () => {
    render(
      <TestHarness
        initial={{
          ...initialVariation,
          syncDescription: false,
          description: 'Texto simples',
        }}
      />
    );

    const aiButton = screen.queryByRole('button', { name: /aperfeiçoar com ia/i });
    expect(aiButton).not.toBeInTheDocument();
  });

  it('permite aperfeiçoar descrição com IA quando showAiImprove estiver ativo', async () => {
    vi.mocked(aiService.improveProductDescription).mockResolvedValueOnce({
      improvedDescription: 'Descrição gerada com IA para a variação.',
    } as any);

    render(
      <TestHarness
        showAiImprove={true}
        initial={{
          ...initialVariation,
          syncDescription: false,
          description: 'Texto simples',
        }}
      />
    );

    const aiButton = screen.getByRole('button', { name: /aperfeiçoar com ia/i });
    expect(aiButton).toBeInTheDocument();

    fireEvent.click(aiButton);

    await waitFor(() => {
      expect(aiService.improveProductDescription).toHaveBeenCalledWith(
        expect.objectContaining({
          currentDescription: 'Texto simples',
          title: 'Mesa de Jantar Madeira 6 Lugares',
        })
      );
      expect(screen.getByTestId('description-state')).toHaveTextContent(
        'Descrição gerada com IA para a variação.'
      );
    });
  });
});
