// @vitest-environment happy-dom
import React from 'react';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ProductDescriptionTab, { validateProductDescriptionPrerequisites } from './ProductDescriptionTab';
import { aiService } from '../../../../utils/aiService';
import { toast } from 'react-toastify';

vi.mock('../../../../utils/aiService', () => ({
  aiService: {
    improveProductDescription: vi.fn(),
    generateDescriptionFromInformativeText: vi.fn(),
  },
}));

vi.mock('react-toastify', () => ({
  toast: {
    warning: vi.fn(),
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

describe('ProductDescriptionTab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('renders with full width container (w-full) without max-w restrictions', () => {
    const formData = { description: 'Descrição de teste' };
    const setFormData = vi.fn();

    const { container } = render(
      <ProductDescriptionTab formData={formData} setFormData={setFormData} />
    );

    const rootDiv = container.firstChild as HTMLElement;
    expect(rootDiv.className).toContain('w-full');
    expect(rootDiv.className).not.toContain('max-w-4xl');

    const textarea = screen.getByRole('textbox', { name: /descrição detalhada do produto/i });
    expect(textarea).toBeTruthy();
    expect(textarea.className).toContain('w-full');
    expect((textarea as HTMLTextAreaElement).value).toBe('Descrição de teste');
  });

  it('calls setFormData when text is changed', () => {
    const formData = { description: '' };
    const setFormData = vi.fn();

    render(<ProductDescriptionTab formData={formData} setFormData={setFormData} />);

    const textarea = screen.getByRole('textbox', { name: /descrição detalhada do produto/i });
    fireEvent.change(textarea, { target: { value: 'Nova descrição completa' } });

    expect(setFormData).toHaveBeenCalled();
  });

  it('valida os pré-requisitos para geração da descrição por características (Modo 1)', () => {
    // Vazio: faltam nome, marca, modelo e cor
    const emptyResult = validateProductDescriptionPrerequisites({});
    expect(emptyResult).toContain('Nome do produto');
    expect(emptyResult).toContain('Marca');
    expect(emptyResult).toContain('Modelo');
    expect(emptyResult).toContain('Cor');

    // Apenas com nome: faltam características
    const withNameOnly = validateProductDescriptionPrerequisites({ name: 'Sofá Retrátil' });
    expect(withNameOnly).not.toContain('Nome do produto');
    expect(withNameOnly).toContain('Marca');
    expect(withNameOnly).toContain('Modelo');
    expect(withNameOnly).toContain('Cor');

    // Completo com direct fields e technicalValues
    const complete = validateProductDescriptionPrerequisites({
      name: 'Sofá Retrátil 3 Lugares',
      brand: 'Morante Estofados',
      model: 'Dallas',
      color: 'Castor',
    });
    expect(complete).toHaveLength(0);

    // Completo com technicalValues
    const completeViaTech = validateProductDescriptionPrerequisites({
      name: 'Mesa de Jantar',
      technicalValues: {
        Marca: 'Morante',
        Modelo: 'Elegance',
        Cor: 'Off White',
      },
    });
    expect(completeViaTech).toHaveLength(0);
  });

  it('exibe toast de aviso e bloqueia a chamada da IA no Modo 1 se faltarem campos obrigatórios', async () => {
    const formData = { name: 'Mesa' };
    const setFormData = vi.fn();

    render(<ProductDescriptionTab formData={formData} setFormData={setFormData} />);

    const starBtn = screen.getByRole('button', { name: /gerar descrição a partir das características/i });
    expect(starBtn).toBeDefined();

    fireEvent.click(starBtn);

    expect(toast.warning).toHaveBeenCalledWith(
      expect.stringContaining('Para gerar a descrição por características, preencha: Marca, Modelo, Cor')
    );
    expect(aiService.improveProductDescription).not.toHaveBeenCalled();
  });

  it('executa a geração por características (Modo 1), exibe loading com shimmer e atualiza formData', async () => {
    const formData = {
      name: 'Sofá Confort',
      brand: 'Morante',
      model: 'Premium',
      color: 'Cinza',
      description: 'Texto antigo',
    };
    const setFormData = vi.fn();

    let resolveAi!: (value: any) => void;
    vi.mocked(aiService.improveProductDescription).mockReturnValue(
      new Promise((res) => {
        resolveAi = res;
      })
    );

    render(<ProductDescriptionTab formData={formData} setFormData={setFormData} />);

    const starBtn = screen.getByRole('button', { name: /gerar descrição a partir das características/i });
    fireEvent.click(starBtn);

    // Deve exibir o indicador com shimmer
    expect(screen.getByTestId('description-shimmer-indicator')).toBeDefined();
    expect(screen.getByText(/gerando descrição com ia.../i)).toBeDefined();

    // Textarea deve estar disabled durante a geração
    const textarea = screen.getByRole('textbox', { name: /descrição detalhada do produto/i });
    expect(textarea.hasAttribute('disabled')).toBe(true);

    // Resolver a chamada da IA
    resolveAi({ improvedDescription: 'Nova descrição estruturada e persuasiva gerada pela IA.' });

    await waitFor(() => {
      expect(setFormData).toHaveBeenCalled();
      expect(toast.success).toHaveBeenCalledWith(
        expect.stringContaining('Descrição gerada com IA a partir das características!')
      );
    });

    // Loading/shimmer deve sumir
    await waitFor(() => {
      expect(screen.queryByTestId('description-shimmer-indicator')).toBeNull();
    });
  });

  it('abre o modal de texto informativo no Modo 2, gera descrição e atualiza formData', async () => {
    const formData = {
      name: 'Cadeira Gamer',
      brand: 'Morante Tech',
      model: 'Force 1',
      color: 'Preta',
    };
    const setFormData = vi.fn();

    vi.mocked(aiService.generateDescriptionFromInformativeText).mockResolvedValue({
      description: 'Descrição rica baseada nas anotações fornecidas.',
    });

    render(<ProductDescriptionTab formData={formData} setFormData={setFormData} />);

    // Clica no botão de "Texto informativo"
    const textBtn = screen.getByRole('button', { name: /gerar descrição via texto informativo/i });
    fireEvent.click(textBtn);

    // O modal deve abrir
    expect(screen.getByText('Gerar Descrição com Texto Informativo')).toBeDefined();

    // Digita o texto informativo
    const modalInput = screen.getByLabelText(/texto informativo \/ anotações do produto/i);
    fireEvent.change(modalInput, {
      target: { value: 'Apoio de braço 3D, pistão classe 4, peso suportado 150kg, rodas de nylon anti-risco.' },
    });

    // Submete o modal
    const submitBtn = screen.getByRole('button', { name: /^gerar descrição$/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(aiService.generateDescriptionFromInformativeText).toHaveBeenCalledWith(
        expect.objectContaining({
          productName: 'Cadeira Gamer',
          informativeText: expect.stringContaining('Apoio de braço 3D'),
        })
      );
      expect(setFormData).toHaveBeenCalled();
      expect(toast.success).toHaveBeenCalledWith(
        expect.stringContaining('Descrição gerada com IA a partir do texto informativo!')
      );
    });
  });

  it('trata erros da IA exibindo toast de erro e limpando o loading', async () => {
    const formData = {
      name: 'Painel TV',
      brand: 'Morante',
      model: 'Ripado',
      color: 'Freijó',
    };
    const setFormData = vi.fn();

    vi.mocked(aiService.improveProductDescription).mockRejectedValue(
      new Error('Erro de conexão com o Gemini')
    );

    render(<ProductDescriptionTab formData={formData} setFormData={setFormData} />);

    const starBtn = screen.getByRole('button', { name: /gerar descrição a partir das características/i });
    fireEvent.click(starBtn);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Erro de conexão com o Gemini');
      expect(screen.queryByTestId('description-shimmer-indicator')).toBeNull();
    });
  });
});
