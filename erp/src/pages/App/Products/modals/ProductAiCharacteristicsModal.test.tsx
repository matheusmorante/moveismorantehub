// @vitest-environment happy-dom
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';
import { ProductAiCharacteristicsModal } from './ProductAiCharacteristicsModal';
import { aiService } from '@/pages/utils/aiService';

vi.mock('@/pages/utils/aiService', () => ({
  aiService: {
    extractProductCharacteristicsWithAI: vi.fn(),
    extractFromDescriptiveTextWithAI: vi.fn(),
  },
}));

vi.mock('../hooks/useAiCharacteristicsQuota', () => ({
  useAiCharacteristicsQuota: () => ({
    stats: {
      usedToday: 5,
      limitToday: 80,
      usedHour: 2,
      limitHour: 20,
      remainingToday: 75,
      remainingHour: 18,
    },
    refresh: vi.fn(),
    isHourlyLimitReached: false,
    isBlocked: false,
  }),
}));

vi.mock('../services/technicalFieldService', () => ({
  fetchTechnicalFieldDefinitions: vi.fn().mockResolvedValue([]),
}));

describe('ProductAiCharacteristicsModal Component', () => {
  const defaultAvailableAttributes = [
    { id: '1', name: 'Cor', dataType: 'text', options: ['Branco', 'Preto', 'Madeira'] },
    { id: '2', name: 'Material', dataType: 'text', options: ['MDP', 'MDF', 'Madeira'] },
    { id: '3', name: 'Quantidade de Portas', dataType: 'number', options: ['2', '3', '4'] },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('habilita o botão Consultar com IA no Modo 1 quando só o nome estiver preenchido', () => {
    render(
      <ProductAiCharacteristicsModal
        isOpen={true}
        onClose={vi.fn()}
        formData={{ name: 'Guarda Roupa' }} // marca, modelo, categoria e fotos são opcionais
        setFormData={vi.fn()}
        availableAttributes={defaultAvailableAttributes}
      />
    );

    const submitBtn = screen.getByRole('button', { name: /Consultar com IA/i }) as HTMLButtonElement;
    expect(submitBtn.disabled).toBe(false);
    expect(screen.queryByText(/Preencha os campos obrigatórios/i)).toBeNull();
  });

  it('habilita o botão Consultar com IA quando Nome, Marca e Modelo estiverem preenchidos, mesmo SEM Categoria', () => {
    render(
      <ProductAiCharacteristicsModal
        isOpen={true}
        onClose={vi.fn()}
        formData={{
          name: 'Guarda Roupa Casal',
          brand: 'Madesa',
          technicalValues: { Modelo: 'Royale' },
          categoryIds: [], // sem categoria
        }}
        categoryName=""
        setFormData={vi.fn()}
        availableAttributes={defaultAvailableAttributes}
      />
    );

    const submitBtn = screen.getByRole('button', { name: /Consultar com IA/i }) as HTMLButtonElement;
    expect(submitBtn.disabled).toBe(false);
    expect(screen.getByText(/Categoria:/i)).toBeDefined();
    expect(screen.getAllByText('Não informada').length).toBeGreaterThan(0);
  });

  it('permite alternar para o Modo 2 (Texto Descritivo) e realizar extração', async () => {
    vi.mocked(aiService.extractFromDescriptiveTextWithAI).mockResolvedValue({
      identifiedProduct: {
        name: 'Guarda Roupa 6 Portas Capri',
        brand: 'Moval',
        model: 'Capri',
        confidence: 'alta',
      },
      description: 'Guarda roupa espaçoso com puxadores em alumínio.',
      technicalValues: {
        Material: 'MDP',
      },
      itemConfidence: {
        Material: 'alta',
      },
      height: 200,
    } as any);

    render(
      <ProductAiCharacteristicsModal
        isOpen={true}
        onClose={vi.fn()}
        formData={{}}
        setFormData={vi.fn()}
        availableAttributes={defaultAvailableAttributes}
        initialMode="descriptive_text"
      />
    );

    expect(screen.getByText(/Texto Descritivo \/ Ficha Técnica do Produto/i)).toBeDefined();

    const textarea = screen.getByPlaceholderText(/Cole aqui o texto completo recebido do fornecedor/i);
    fireEvent.change(textarea, {
      target: { value: 'Guarda Roupa Moval Capri 6 portas em MDP altura 200cm' },
    });

    const submitBtn = screen.getByRole('button', { name: /Gerar com IA/i });
    fireEvent.click(submitBtn);

    expect(await screen.findByText('Guarda Roupa 6 Portas Capri')).toBeDefined();
    expect(screen.getByText('Moval')).toBeDefined();
    expect(screen.getAllByDisplayValue('MDP').length).toBeGreaterThan(0);
  });

  it('apresenta o modal de revisão responsivo com identificação e status Já preenchido para dados existentes', async () => {
    vi.mocked(aiService.extractProductCharacteristicsWithAI).mockResolvedValue({
      identifiedProduct: {
        name: 'Guarda Roupa Casal Royale Madesa',
        brand: 'Madesa',
        model: 'Royale',
        confidence: 'alta',
        sources: [{ title: 'Site Oficial Madesa', uri: 'https://madesa.com/royale' }],
        divergences: '',
      },
      technicalValues: {
        Cor: 'Branco',
        Material: 'MDP',
      },
      itemConfidence: {
        Cor: 'alta',
        Material: 'baixa',
      },
      height: 205,
      reasoning: 'Informações extraídas diretamente do site oficial do fabricante.',
    } as any);

    render(
      <ProductAiCharacteristicsModal
        isOpen={true}
        onClose={vi.fn()}
        formData={{
          name: 'Guarda Roupa Casal',
          brand: 'Madesa',
          technicalValues: {
            Modelo: 'Royale',
            Cor: 'Preto', // Já preenchido manualmente no ERP!
          },
        }}
        categoryName="Quarto"
        setFormData={vi.fn()}
        availableAttributes={defaultAvailableAttributes}
      />
    );

    const submitBtn = screen.getByRole('button', { name: /Consultar com IA/i });
    fireEvent.click(submitBtn);

    // Deve avançar para a fase de revisão
    expect(await screen.findByText('Guarda Roupa Casal Royale Madesa')).toBeDefined();
    expect(screen.getByText('Site Oficial Madesa')).toBeDefined();

    // Verificação da regra de proteção: 'Cor' já estava preenchido ('Preto') no ERP, então exibe 'Já preenchido'
    expect(screen.getAllByText('Já preenchido').length).toBeGreaterThan(0);

    // Pode voltar para a escolha de modo
    const backBtn = screen.getByRole('button', { name: /Voltar \/ Escolher Modo/i });
    fireEvent.click(backBtn);
    expect(screen.getByText(/1\. Pesquisar na Web/i)).toBeDefined();
  });

  it('permite aplicar ao formulário apenas os campos selecionados', async () => {
    vi.mocked(aiService.extractProductCharacteristicsWithAI).mockResolvedValue({
      identifiedProduct: {
        name: 'Guarda Roupa Royale',
        brand: 'Madesa',
        model: 'Royale',
        confidence: 'alta',
      },
      technicalValues: {
        Material: 'MDP',
      },
      itemConfidence: {
        Material: 'alta',
      },
    } as any);

    const mockSetFormData = vi.fn();
    const mockOnClose = vi.fn();

    render(
      <ProductAiCharacteristicsModal
        isOpen={true}
        onClose={mockOnClose}
        formData={{
          name: 'Guarda Roupa',
          brand: 'Madesa',
          technicalValues: { Modelo: 'Royale' },
        }}
        categoryName="Móveis"
        setFormData={mockSetFormData}
        availableAttributes={defaultAvailableAttributes}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /Consultar com IA/i }));

    expect(await screen.findByText(/campos selecionados para preenchimento/i)).toBeDefined();

    const applyBtn = screen.getByRole('button', { name: /Aplicar .* campo/i });
    fireEvent.click(applyBtn);

    expect(mockSetFormData).toHaveBeenCalled();
    expect(mockOnClose).toHaveBeenCalled();
  });
});
