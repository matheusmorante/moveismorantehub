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
    supportMode: 'automatico' as const,
    isAiAgentEnabled: false,
    isAgentStatusKnown: true,
    onOpenSettings: vi.fn(),
    onBack: vi.fn(),
  };

  it('renderiza a interface do chat com cabeçalho, mensagem inicial e pílulas de cenários', () => {
    render(<AiAgentTabTestChat {...defaultProps} />);

    expect(screen.getByRole('heading', { name: 'Seu Lizandro' })).toBeDefined();
    expect(screen.getByText('Sandbox Isolado')).toBeDefined();
    expect(screen.getByText(/Consultas reais ao ERP · Sem envio ao WhatsApp/i)).toBeDefined();
    expect(screen.queryByText('Nova Conversa')).toBeNull();
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

  it('mantém apenas o status e atalhos de navegação dentro da conversa de teste', () => {
    const { rerender } = render(<AiAgentTabTestChat {...defaultProps} />);
    expect(screen.getByRole('status').textContent).toBe('Desligado');
    expect(screen.queryByRole('button', { name: /ligar atendimento de clientes por ia/i })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /configurações do agente de ia/i }));
    fireEvent.click(screen.getByRole('button', { name: /voltar para conversas/i }));
    expect(defaultProps.onOpenSettings).toHaveBeenCalledTimes(1);
    expect(defaultProps.onBack).toHaveBeenCalledTimes(1);
    rerender(<AiAgentTabTestChat {...defaultProps} isAiAgentEnabled supportMode="assistido" />);
    expect(screen.getByText(/Modo: Assistido/i)).toBeDefined();
    expect(screen.getByRole('status').textContent).toBe('Ligado');
    expect(screen.queryByRole('button', { name: /desligar atendimento de clientes por ia/i })).toBeNull();
  });

  it('valida mensagem vazia antes de chamar a simulação', async () => {
    const simulate = vi.spyOn(orchestrator, 'simulateWhatsAppAiTurn');
    render(<AiAgentTabTestChat {...defaultProps} />);
    fireEvent.submit(screen.getByRole('form', { name: 'Mensagem de teste' }));
    expect(await screen.findByText('Digite uma mensagem para enviar.')).toBeDefined();
    expect(simulate).not.toHaveBeenCalled();
  });

  it('permite enviar mensagem através do input de texto e renderiza a resposta simulada com pill de diagnóstico', async () => {
    const mockSimulationResult: orchestrator.SimulationTurnResult = {
      executed: true,
      userQuery: 'Qual o valor do frete para Colombo?',
      situation: {
        key: 'entrega_e_prazos',
        name: 'Frete e Prazos de Entrega',
        priority: 10,
        action: 'direct_answer',
      },
      matchedKeywords: ['frete', 'entrega', 'colombo'],
      articlesUsed: [
        {
          id: 'frete-politica',
          title: 'Frete e Prazos de Entrega',
          category: 'entrega',
          priority: 10,
        },
      ],
      workflowApplied: null,
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

    const input = screen.getByPlaceholderText(/Digite uma mensagem para testar o Seu Lizandro/i);
    fireEvent.change(input, { target: { value: 'Qual o valor do frete para Colombo?' } });

    const sendBtn = screen.getByRole('button', { name: /Enviar/i });
    fireEvent.click(sendBtn);

    // Mensagem do usuário visível
    await waitFor(() => expect(screen.getByText('Qual o valor do frete para Colombo?')).toBeDefined());

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
      executed: true,
      userQuery: 'Vocês têm guarda-roupa 6 portas?',
      situation: {
        key: 'consulta_produto',
        name: 'Consulta de Produtos e Catálogo',
        priority: 10,
        action: 'direct_answer',
      },
      matchedKeywords: ['guarda-roupa', 'portas'],
      articlesUsed: [],
      workflowApplied: null,
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

    const input = screen.getByPlaceholderText(/Digite uma mensagem para testar o Seu Lizandro/i);
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
      executed: true,
      userQuery: 'Quero desconto',
      situation: null,
      matchedKeywords: [],
      articlesUsed: [],
      workflowApplied: null,
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
    const saveFeedbackBtn = screen.getByRole('button', { name: 'Salvar' });
    fireEvent.click(saveFeedbackBtn);
    expect(await screen.findByText('Descreva a falha antes de salvar.')).toBeDefined();

    fireEvent.change(feedbackInput, {
      target: { value: 'Deveria ter informado a política de 10x sem juros.' },
    });

    fireEvent.click(saveFeedbackBtn);

    // Comentário exibido
    await waitFor(() => expect(
      screen.getByText(/Observação registrada: “Deveria ter informado a política de 10x sem juros.”/i)
    ).toBeDefined());

    // Thumbs up
    const thumbsUpBtn = screen.getByTitle('Avaliar como resposta correta');
    fireEvent.click(thumbsUpBtn);
  });

  it('salva o caso de teste em localStorage ao clicar em "Salvar Teste"', async () => {
    const mockSimulationResult: orchestrator.SimulationTurnResult = {
      executed: true,
      userQuery: 'Qual o valor do frete?',
      situation: null,
      matchedKeywords: [],
      articlesUsed: [],
      workflowApplied: null,
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
    const input = screen.getByPlaceholderText(/Digite uma mensagem para testar o Seu Lizandro/i);
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
      executed: true,
      userQuery: 'Quero um sofá',
      situation: null,
      matchedKeywords: [],
      articlesUsed: [],
      workflowApplied: null,
      toolsCalled: [],
      aiResponseText: 'Temos sofás retráteis e de canto. Qual você prefere?',
      mandatoryPhrasesEnforced: [],
      executionTimeMs: 200,
    });

    render(<AiAgentTabTestChat {...defaultProps} />);

    const input = screen.getByPlaceholderText(/Digite uma mensagem para testar o Seu Lizandro/i);
    fireEvent.change(input, { target: { value: 'Quero um sofá' } });
    fireEvent.click(screen.getByRole('button', { name: /Enviar/i }));

    await waitFor(() => {
      expect(
        screen.getByText('Temos sofás retráteis e de canto. Qual você prefere?')
      ).toBeDefined();
    });

    // Turn 2
    mockSimulate.mockResolvedValueOnce({
      executed: true,
      userQuery: 'Retrátil na cor cinza',
      situation: null,
      matchedKeywords: [],
      articlesUsed: [],
      workflowApplied: null,
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

  it('solicita intervenção humana no chat de teste quando a simulação falha', async () => {
    vi.spyOn(orchestrator, 'simulateWhatsAppAiTurn').mockRejectedValueOnce(
      new Error('Erro de conexão com a API da OpenAI (503 Service Unavailable)')
    );

    render(<AiAgentTabTestChat {...defaultProps} />);

    const input = screen.getByPlaceholderText(/Digite uma mensagem para testar o Seu Lizandro/i);
    fireEvent.change(input, { target: { value: 'Olá!' } });
    fireEvent.click(screen.getByRole('button', { name: /Enviar/i }));

    await waitFor(() => {
      expect(screen.getByText(/Intervenção humana solicitada no teste/i)).toBeDefined();
    });
    expect(screen.queryByText(/Erro na simulação do agente/i)).toBeNull();
    expect(screen.getByText(/503 Service Unavailable/i)).toBeDefined();
  });

  it('renderiza os cards de produto do WhatsApp quando a simulação retorna produtos nativos', async () => {
    vi.spyOn(orchestrator, 'simulateWhatsAppAiTurn').mockResolvedValueOnce({
      executed: true,
      userQuery: 'balcoes para pia',
      situation: null,
      matchedKeywords: [],
      articlesUsed: [],
      workflowApplied: null,
      toolsCalled: [{
        name: 'buscarProdutos',
        args: { termo: 'balcão para pia', enviarCartoes: true },
        result: {
          success: true,
          total: 2,
          produtos: [
            { codigo: '000122', nome: 'Balcão 1,20m Darmovel' },
            { codigo: '000217', nome: 'Balcão 1,20m Florença' },
          ],
        },
      }],
      aiResponseText: 'Tenho 2 modelos de balcão para pia:',
      mandatoryPhrasesEnforced: [],
      executionTimeMs: 320,
      nativeCatalogProducts: [
        { retailerId: '000122', name: 'Balcão 1,20m Darmovel' },
        { retailerId: '000217', name: 'Balcão 1,20m Florença' },
      ],
    });

    render(<AiAgentTabTestChat {...defaultProps} />);

    const input = screen.getByPlaceholderText(/Digite uma mensagem para testar o Seu Lizandro/i);
    fireEvent.change(input, { target: { value: 'balcoes para pia' } });
    fireEvent.click(screen.getByRole('button', { name: /Enviar/i }));

    await waitFor(() => {
      expect(screen.getByText('Tenho 2 modelos de balcão para pia:')).toBeDefined();
    });

    expect(screen.getByText(/2 produtos/i)).toBeDefined();
    expect(screen.getByText(/Deslize para ver/i)).toBeDefined();
    expect(screen.getByText('Balcão 1,20m Darmovel')).toBeDefined();
    expect(screen.getByText('Balcão 1,20m Florença')).toBeDefined();
  });
});
