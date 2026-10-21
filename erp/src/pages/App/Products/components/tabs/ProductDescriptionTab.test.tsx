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
    // Vazio: faltam nome, marca e modelo (cor NÃO é exigida para descrição pois pertence a variações)
    const emptyResult = validateProductDescriptionPrerequisites({});
    expect(emptyResult).toContain('Nome do produto');
    expect(emptyResult).toContain('Marca');
    expect(emptyResult).toContain('Modelo');
    expect(emptyResult).not.toContain('Cor');

    // Apenas com nome: faltam marca e modelo
    const withNameOnly = validateProductDescriptionPrerequisites({ name: 'Sofá Retrátil' });
    expect(withNameOnly).not.toContain('Nome do produto');
    expect(withNameOnly).toContain('Marca');
    expect(withNameOnly).toContain('Modelo');
    expect(withNameOnly).not.toContain('Cor');

    // Completo mesmo sem cor informada
    const completeWithoutColor = validateProductDescriptionPrerequisites({
      name: 'Sofá Retrátil 3 Lugares',
      brand: 'Morante Estofados',
      model: 'Dallas',
    });
    expect(completeWithoutColor).toHaveLength(0);

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

  it('não renderiza container com borda amarela nem botão avulso de texto informativo na aba', () => {
    const formData = { name: 'Mesa' };
    const setFormData = vi.fn();

    render(<ProductDescriptionTab formData={formData} setFormData={setFormData} />);

    // Deve ter apenas o botão principal de IA no cabeçalho
    expect(screen.getByRole('button', { name: /gerar descrição com ia/i })).toBeDefined();

    // Não deve conter o container com o banner antigo
    expect(screen.queryByText('Gerar Descrição com IA', { selector: 'span' })).toBeNull();

    // Não deve ter botão avulso na aba chamado "Texto informativo"
    expect(screen.queryByRole('button', { name: /gerar descrição via texto informativo/i })).toBeNull();
    expect(screen.queryByText('Texto informativo')).toBeNull();
  });

  it('abre o modal ao clicar no botão de IA e bloqueia a geração por características se faltarem campos', async () => {
    const formData = { name: 'Mesa' };
    const setFormData = vi.fn();

    render(<ProductDescriptionTab formData={formData} setFormData={setFormData} />);

    const aiBtn = screen.getByRole('button', { name: /gerar descrição com ia/i });
    fireEvent.click(aiBtn);

    // O modal deve abrir com o título
    expect(screen.getByText('Gerar Descrição com IA')).toBeDefined();

    // Na aba de características, como faltam campos, o botão fica desabilitado e há alerta
    const charTabBtn = screen.getByRole('button', { name: /características do cadastro/i });
    fireEvent.click(charTabBtn);

    expect(screen.getByText(/campos recomendados pendentes/i)).toBeDefined();
    expect(screen.getByText(/marca, modelo/i)).toBeDefined();

    const submitCharBtn = screen.getByRole('button', { name: /gerar descrição a partir das características/i });
    expect(submitCharBtn.hasAttribute('disabled')).toBe(true);

    expect(aiService.improveProductDescription).not.toHaveBeenCalled();
  });

  it('executa a geração por características (Modo 1) pelo modal, exibe shimmer e atualiza formData', async () => {
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

    // Abre o modal
    const aiBtn = screen.getByRole('button', { name: /gerar descrição com ia/i });
    fireEvent.click(aiBtn);

    // Como os dados estão completos, o modo características é o inicial e o botão está ativo
    const charBtn = screen.getByRole('button', { name: /gerar descrição a partir das características/i });
    expect(charBtn.hasAttribute('disabled')).toBe(false);

    fireEvent.click(charBtn);

    // Deve exibir o indicador com shimmer na aba
    expect(screen.getByTestId('description-shimmer-indicator')).toBeDefined();
    expect(screen.getByText(/gerando descrição com ia.../i)).toBeDefined();

    // Textarea deve estar disabled durante a geração
    const textarea = screen.getByRole('textbox', { name: /descrição detalhada do produto/i });
    expect(textarea.hasAttribute('disabled')).toBe(true);

    // Resolver a chamada da IA
    resolveAi({ improvedDescription: 'Nova descrição estruturada e persuasiva gerada pela IA.' });

    await waitFor(() => {
      expect(aiService.improveProductDescription).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Sofá Confort',
          brand: 'Morante',
          model: 'Premium',
          technicalValues: expect.not.objectContaining({
            Cor: expect.anything(),
          }),
        })
      );
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

  it('abre o modal e gera descrição a partir do texto descritivo (Modo 2)', async () => {
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

    // Abre o modal pelo botão principal de IA
    const aiBtn = screen.getByRole('button', { name: /gerar descrição com ia/i });
    fireEvent.click(aiBtn);

    // Alterna para o modo de texto descritivo / anotações
    const textTabBtn = screen.getByRole('button', { name: /texto descritivo \/ anotações/i });
    fireEvent.click(textTabBtn);

    // Digita o texto informativo
    const modalInput = screen.getByLabelText(/texto informativo \/ anotações do produto/i);
    fireEvent.change(modalInput, {
      target: { value: 'Apoio de braço 3D, pistão classe 4, peso suportado 150kg, rodas de nylon anti-risco.' },
    });

    // Submete o modal
    const submitBtn = screen.getByRole('button', { name: /gerar descrição via texto informativo/i });
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

    const aiBtn = screen.getByRole('button', { name: /gerar descrição com ia/i });
    fireEvent.click(aiBtn);

    const charBtn = screen.getByRole('button', { name: /gerar descrição a partir das características/i });
    fireEvent.click(charBtn);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Erro de conexão com o Gemini');
      expect(screen.queryByTestId('description-shimmer-indicator')).toBeNull();
    });
  });
});
