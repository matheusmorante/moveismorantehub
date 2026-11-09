// @vitest-environment happy-dom
import React from 'react';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AiAgentTabTestChat } from '../components/aiAgentModal/AiAgentTabTestChat';
import {
  DEFAULT_WHATSAPP_AI_AGENT_PROMPT,
  DEFAULT_KNOWLEDGE_ARTICLES,
  DEFAULT_SITUATION_RULES,
  DEFAULT_WORKFLOWS,
  WHATSAPP_SAFE_TOOLS,
} from '../../../../../../shared-utils/whatsappAiAgentSchemas';
import * as orchestrator from '@/pages/utils/customerSupport/whatsappAiAgent/whatsappAiAgentOrchestrator';

vi.mock('react-toastify', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
  },
}));

vi.mock('@/pages/utils/supabaseConfig', () => ({
  supabase: {},
}));

vi.mock('@/pages/utils/settings', () => ({
  getSettings: () => ({
    whatsappAiAgent: {
      enabled: true,
      testMode: true,
      testPhoneNumbers: ['5541999998888'],
    },
  }),
}));

describe('AiAgentTabTestChat (Chat de Testes do Agente)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  afterEach(() => {
    cleanup();
  });

  const defaultProps = {
    rules: [...DEFAULT_SITUATION_RULES],
    knowledgeBase: [...DEFAULT_KNOWLEDGE_ARTICLES],
    workflows: [...DEFAULT_WORKFLOWS],
    enabledTools: WHATSAPP_SAFE_TOOLS.map((t) => t.id),
    systemPrompt: DEFAULT_WHATSAPP_AI_AGENT_PROMPT,
    isAdministrator: true,
  };

  it('renderiza a interface do chat com cabeçalho, mensagem inicial e pílulas de cenários', () => {
    render(<AiAgentTabTestChat {...defaultProps} />);

    expect(screen.getByText('Lizandro — Chat de Testes do Agente')).toBeDefined();
    expect(screen.getByText('Sandbox Isolado')).toBeDefined();
    expect(screen.getByText(/Consultas reais ao ERP · Sem envio externo/i)).toBeDefined();
    expect(screen.getByText('Nova Conversa')).toBeDefined();
    expect(screen.getByText('Salvar Teste')).toBeDefined();

    // Mensagem de boas-vindas do Seu Lizandro
    expect(
      screen.getByText(/Sou o Seu Lizandro, assistente virtual da Móveis Morante/i)
    ).toBeDefined();

    // Cenários de sugestão
    expect(screen.getByText('Qual o preço do Sofá Retrátil Madri no catálogo?')).toBeDefined();
    expect(screen.getByText('Vocês têm guarda-roupa 6 portas em estoque?')).toBeDefined();
    expect(screen.getByText('Como funciona o frete e entrega para Colombo?')).toBeDefined();
  });

  it('permite enviar mensagem através do input de texto e renderiza a resposta simulada com pill de diagnóstico', async () => {
    const mockSimulationResult: orchestrator.SimulationTurnResult = {
      userQuery: 'Qual o valor do frete para Colombo?',
      situation: {
        situationKey: 'entrega_e_prazos',
        name: 'Frete e Prazos de Entrega',
        priority: 10,
        action: 'direct_answer',
        mandatoryPhrases: ['A taxa de entrega varia conforme a região metropolitana.'],
      },
      matchedKeywords: ['frete', 'entrega', 'colombo'],
      articlesUsed: [
        {
          id: 'frete-politica',
          title: 'Frete e Prazos de Entrega',
          category: 'entrega',
          content: 'Entregamos em Curitiba e Região Metropolitana.',
          priority: 10,
        },
      ],
      toolsCalled: [
        {
          name: 'consultarRegrasEntrega',
          args: { municipio: 'Colombo' },
          result: { taxaFrete: 60, prazoEstimadoDias: 3 },
        },
      ],
      aiResponseText: 'O frete para Colombo é de R$ 60,00 com prazo estimado de 3 dias úteis.',
      mandatoryPhrasesEnforced: ['A taxa de entrega varia conforme a região metropolitana.'],
      executionTimeMs: 420,
    };

    const spySimulate = vi
      .spyOn(orchestrator, 'simulateWhatsAppAiTurn')
      .mockResolvedValueOnce(mockSimulationResult);

    render(<AiAgentTabTestChat {...defaultProps} />);

    const input = screen.getByPlaceholderText(/Digite uma mensagem para o Lizandro/i);
    fireEvent.change(input, { target: { value: 'Qual o valor do frete para Colombo?' } });

    const sendBtn = screen.getByRole('button', { name: /Enviar/i });
    fireEvent.click(sendBtn);

    // Mensagem do usuário visível
    expect(screen.getByText('Qual o valor do frete para Colombo?')).toBeDefined();

    // Aguarda a resposta do modelo
    await waitFor(() => {
      expect(
        screen.getByText('O frete para Colombo é de R$ 60,00 com prazo estimado de 3 dias úteis.')
      ).toBeDefined();
    });

    expect(spySimulate).toHaveBeenCalledTimes(1);

    // Pill de diagnóstico rápido visível
    expect(screen.getByText(/1 ferramenta\(s\) · Frete e Prazos de · 0.4s/i)).toBeDefined();
  });

  it('abre o drawer de diagnóstico detalhado ao clicar na pílula e permite fechá-lo', async () => {
    const mockSimulationResult: orchestrator.SimulationTurnResult = {
      userQuery: 'Vocês têm guarda-roupa 6 portas?',
      situation: {
        situationKey: 'consulta_produto',
        name: 'Consulta de Produtos e Catálogo',
        priority: 10,
        action: 'direct_answer',
        mandatoryPhrases: ['Temos diversas opções de guarda-roupas de qualidade.'],
      },
      matchedKeywords: ['guarda-roupa', 'portas'],
      articlesUsed: [],
      toolsCalled: [
        {
          name: 'buscarProdutosNoCatalogo',
          args: { termo: 'guarda-roupa 6 portas' },
          result: {
            produtos: [
              {
                id: 'prod-123',
                nome: 'Guarda-Roupa Casal 6 Portas Morante Luxo',
                precoVenda: 1499.0,
                quantidadeEstoque: 5,
              },
            ],
          },
        },
      ],
      aiResponseText: 'Temos sim! O Guarda-Roupa Casal 6 Portas Morante Luxo está saindo por R$ 1.499,00.',
      mandatoryPhrasesEnforced: ['Temos diversas opções de guarda-roupas de qualidade.'],
      executionTimeMs: 650,
    };

    vi.spyOn(orchestrator, 'simulateWhatsAppAiTurn').mockResolvedValueOnce(mockSimulationResult);

    render(<AiAgentTabTestChat {...defaultProps} />);

    const input = screen.getByPlaceholderText(/Digite uma mensagem para o Lizandro/i);
    fireEvent.change(input, { target: { value: 'Vocês têm guarda-roupa 6 portas?' } });
    fireEvent.click(screen.getByRole('button', { name: /Enviar/i }));

    await waitFor(() => {
      expect(screen.getByText(/1 ferramenta\(s\) · Consulta de Produt/i)).toBeDefined();
    });

    // Clica no botão de diagnóstico
    const diagButton = screen.getByText(/1 ferramenta\(s\) · Consulta de Produt/i);
    fireEvent.click(diagButton);

    // O drawer abre
    const drawer = screen.getByRole('dialog', { name: 'Detalhes da Execução da Resposta' });
    expect(drawer).toBeDefined();
    expect(screen.getByText('buscarProdutosNoCatalogo')).toBeDefined();
    expect(screen.getAllByText(/Guarda-Roupa Casal 6 Portas Morante Luxo/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/R\$ 1499.00 \(Estoque: 5\)/i)).toBeDefined();
    expect(screen.getByText('Preços de custo blindados')).toBeDefined();
    expect(screen.getByText('Frases Obrigatórias com Garantia Determinística')).toBeDefined();

    // Fecha o drawer
    const closeDrawerBtn = screen.getByLabelText('Fechar painel de diagnóstico');
    fireEvent.click(closeDrawerBtn);

    expect(
      screen.queryByRole('dialog', { name: 'Detalhes da Execução da Resposta' })
    ).toBeNull();
  });

  it('permite avaliar resposta com positivo (thumbs up) e negativo (thumbs down) com comentário', async () => {
    const mockSimulationResult: orchestrator.SimulationTurnResult = {
      userQuery: 'Quero desconto',
      situation: null,
      matchedKeywords: [],
      articlesUsed: [],
      toolsCalled: [],
      aiResponseText: 'Posso verificar com a gerência.',
      mandatoryPhrasesEnforced: [],
      executionTimeMs: 200,
    };

    vi.spyOn(orchestrator, 'simulateWhatsAppAiTurn').mockResolvedValueOnce(mockSimulationResult);

    render(<AiAgentTabTestChat {...defaultProps} />);

    // Clica em um cenário
    fireEvent.click(screen.getByText('Vocês parcelam em até 10x sem juros no cartão?'));

    await waitFor(() => {
      expect(screen.getByText('Posso verificar com a gerência.')).toBeDefined();
    });

    // Thumbs down
    const thumbsDownBtn = screen.getByTitle('Avaliar como resposta incorreta');
    fireEvent.click(thumbsDownBtn);

    // Abre campo de feedback
    expect(screen.getByText('Qual foi a falha desta resposta?')).toBeDefined();

    const feedbackInput = screen.getByPlaceholderText(
      /Ex: Não informou a taxa de entrega corretamente.../i
    );
    fireEvent.change(feedbackInput, {
      target: { value: 'Deveria ter informado a política de 10x sem juros.' },
    });

    const saveFeedbackBtn = screen.getByRole('button', { name: 'Salvar' });
    fireEvent.click(saveFeedbackBtn);

    // Comentário exibido
    expect(
      screen.getByText(/Observação registrada: “Deveria ter informado a política de 10x sem juros.”/i)
    ).toBeDefined();

    // Thumbs up
    const thumbsUpBtn = screen.getByTitle('Avaliar como resposta correta');
    fireEvent.click(thumbsUpBtn);
  });

  it('reinicia a sessão ao clicar em "Nova Conversa"', async () => {
    const mockSimulationResult: orchestrator.SimulationTurnResult = {
      userQuery: 'Oi',
      situation: null,
      matchedKeywords: [],
      articlesUsed: [],
      toolsCalled: [],
      aiResponseText: 'Olá! Como posso ajudar?',
      mandatoryPhrasesEnforced: [],
      executionTimeMs: 150,
    };

    vi.spyOn(orchestrator, 'simulateWhatsAppAiTurn').mockResolvedValueOnce(mockSimulationResult);

    render(<AiAgentTabTestChat {...defaultProps} />);

    const input = screen.getByPlaceholderText(/Digite uma mensagem para o Lizandro/i);
    fireEvent.change(input, { target: { value: 'Oi' } });
    fireEvent.click(screen.getByRole('button', { name: /Enviar/i }));

    await waitFor(() => {
      expect(screen.getByText('Olá! Como posso ajudar?')).toBeDefined();
    });

    // Clica em Nova Conversa
    fireEvent.click(screen.getByText('Nova Conversa'));

    expect(
      screen.getByText(/Nova conversa iniciada. O contexto anterior foi reiniciado/i)
    ).toBeDefined();
    expect(screen.queryByText('Olá! Como posso ajudar?')).toBeNull();
  });

  it('salva o caso de teste em localStorage ao clicar em "Salvar Teste"', async () => {
    const mockSimulationResult: orchestrator.SimulationTurnResult = {
      userQuery: 'Qual o valor do frete?',
      situation: null,
      matchedKeywords: [],
      articlesUsed: [],
      toolsCalled: [],
      aiResponseText: 'Entregamos em Curitiba e Região.',
      mandatoryPhrasesEnforced: [],
      executionTimeMs: 300,
    };

    vi.spyOn(orchestrator, 'simulateWhatsAppAiTurn').mockResolvedValueOnce(mockSimulationResult);

    render(<AiAgentTabTestChat {...defaultProps} />);

    // Tentar salvar sem mensagens do usuário mostra aviso
    fireEvent.click(screen.getByText('Salvar Teste'));
    expect(localStorage.getItem('morante_ai_saved_test_cases')).toBeNull();

    // Envia mensagem
    const input = screen.getByPlaceholderText(/Digite uma mensagem para o Lizandro/i);
    fireEvent.change(input, { target: { value: 'Qual o valor do frete?' } });
    fireEvent.click(screen.getByRole('button', { name: /Enviar/i }));

    await waitFor(() => {
      expect(screen.getByText('Entregamos em Curitiba e Região.')).toBeDefined();
    });

    // Salva agora
    fireEvent.click(screen.getByText('Salvar Teste'));

    const saved = JSON.parse(localStorage.getItem('morante_ai_saved_test_cases') || '[]');
    expect(saved.length).toBe(1);
    expect(saved[0].title).toBe('Qual o valor do frete?');
  });

  it('mantém o contexto multi-turnos ao enviar mensagens consecutivas', async () => {
    const mockSimulate = vi.spyOn(orchestrator, 'simulateWhatsAppAiTurn');

    // Turn 1
    mockSimulate.mockResolvedValueOnce({
      userQuery: 'Quero um sofá',
      situation: null,
      matchedKeywords: [],
      articlesUsed: [],
      toolsCalled: [],
      aiResponseText: 'Temos sofás retráteis e de canto. Qual você prefere?',
      mandatoryPhrasesEnforced: [],
      executionTimeMs: 200,
    });

    render(<AiAgentTabTestChat {...defaultProps} />);

    const input = screen.getByPlaceholderText(/Digite uma mensagem para o Lizandro/i);
    fireEvent.change(input, { target: { value: 'Quero um sofá' } });
    fireEvent.click(screen.getByRole('button', { name: /Enviar/i }));

    await waitFor(() => {
      expect(
        screen.getByText('Temos sofás retráteis e de canto. Qual você prefere?')
      ).toBeDefined();
    });

    // Turn 2
    mockSimulate.mockResolvedValueOnce({
      userQuery: 'Retrátil na cor cinza',
      situation: null,
      matchedKeywords: [],
      articlesUsed: [],
      toolsCalled: [],
      aiResponseText: 'O modelo Madri retrátil cinza está disponível por R$ 1.890,00.',
      mandatoryPhrasesEnforced: [],
      executionTimeMs: 250,
    });

    fireEvent.change(input, { target: { value: 'Retrátil na cor cinza' } });
    fireEvent.click(screen.getByRole('button', { name: /Enviar/i }));

    await waitFor(() => {
      expect(
        screen.getByText('O modelo Madri retrátil cinza está disponível por R$ 1.890,00.')
      ).toBeDefined();
    });

    // Confirma que a segunda chamada recebeu o histórico do primeiro turno
    expect(mockSimulate).toHaveBeenCalledTimes(2);
    const secondCallHistory = mockSimulate.mock.calls[1][5]; // 6th argument is history
    expect(secondCallHistory).toBeDefined();
    expect(secondCallHistory?.length).toBeGreaterThanOrEqual(2);
    expect(secondCallHistory).toContainEqual({
      role: 'user',
      text: 'Quero um sofá',
    });
    expect(secondCallHistory).toContainEqual({
      role: 'model',
      text: 'Temos sofás retráteis e de canto. Qual você prefere?',
    });
  });

  it('trata erros de simulação graciosamente sem travar a interface', async () => {
    vi.spyOn(orchestrator, 'simulateWhatsAppAiTurn').mockRejectedValueOnce(
      new Error('Erro de conexão com a API do Gemini (503 Service Unavailable)')
    );

    render(<AiAgentTabTestChat {...defaultProps} />);

    const input = screen.getByPlaceholderText(/Digite uma mensagem para o Lizandro/i);
    fireEvent.change(input, { target: { value: 'Olá!' } });
    fireEvent.click(screen.getByRole('button', { name: /Enviar/i }));

    await waitFor(() => {
      expect(
        screen.getByText(
          /Erro na simulação do agente: Erro de conexão com a API do Gemini \(503 Service Unavailable\)/i
        )
      ).toBeDefined();
    });
  });
});
