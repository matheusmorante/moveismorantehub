import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  maybeTriggerWhatsAppAiAgent,
  executeWhatsAppAiTurn,
  clearProcessedMessagesCache,
  type InboundMessageParams,
  type WhatsAppAiAgentDependencies,
} from '@/pages/utils/customerSupport/whatsappAiAgentService';
import type { WhatsAppAiAgentConfig } from '@/pages/utils/settings/types';
import { DEFAULT_WHATSAPP_AI_AGENT_PROMPT } from '../../../../../../shared-utils/whatsappAiAgentSchemas';

const openAiTextResponse = (text: string) => new Response(JSON.stringify({
  output_text: text,
  output: [{ type: 'message', content: [{ type: 'output_text', text }] }],
  usage: { input_tokens: 12, output_tokens: 8, total_tokens: 20 },
}), { status: 200, headers: { 'Content-Type': 'application/json' } });

const openAiToolCallResponse = (name: string, args: Record<string, unknown>) => new Response(JSON.stringify({
  output: [{ type: 'function_call', call_id: 'call_e2e', name, arguments: JSON.stringify(args) }],
  usage: { input_tokens: 12, output_tokens: 8, total_tokens: 20 },
}), { status: 200, headers: { 'Content-Type': 'application/json' } });

describe('Auditoria de Integração Ponta a Ponta: Agente de IA Comercial (Lizandro)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearProcessedMessagesCache();
  });

  const authorizedPhone = '5541999998888';
  const unauthorizedPhone = '5541911112222';

  const defaultTestConfig: WhatsAppAiAgentConfig = {
    enabled: true,
    testMode: true,
    testPhoneNumbers: [authorizedPhone],
    supportMode: 'automatico',
    systemPrompt: DEFAULT_WHATSAPP_AI_AGENT_PROMPT,
    enabledTools: [
      'buscarProdutos',
      'obterDetalhesProduto',
      'listarCategoriasECaracteristicasProduto',
      'obterInformacoesComerciaisLoja',
      'consultarMeusPedidos',
      'encaminharParaAtendimentoHumano',
    ],
  };

  const sampleAuthorizedInbound: InboundMessageParams = {
    conversationId: 'conv-e2e-01',
    messageId: 'msg-in-e2e-01',
    from: authorizedPhone,
    contactPhoneE164: `+${authorizedPhone}`,
    contactProfile: 'Matheus Teste',
    text: 'Qual o valor do Sofá Retrátil Madri?',
    wamid: 'wamid.e2e.001',
    businessPhoneNumberId: 'phone-biz-test',
  };

  const createMockEnvironment = (options?: {
    config?: Partial<WhatsAppAiAgentConfig>;
    conversation?: any;
    products?: any[];
  }) => {
    let currentConfig: WhatsAppAiAgentConfig = {
      ...defaultTestConfig,
      ...(options?.config || {}),
    };

    let convState = {
      id: 'conv-e2e-01',
      assigned_to: null,
      is_archived: false,
      tags: [],
      customer_id: 'cust-e2e-1',
      contact_phone: `+${authorizedPhone}`,
      ...(options?.conversation || {}),
    };

    const insertedMessages: any[] = [];
    const conversationUpdates: any[] = [];

    const mockProducts = options?.products ?? [
      {
        id: 'prod-101',
        code: '100101',
        sku: 'SOFA-MADRI-01',
        name: 'Sofá Retrátil Madri 3 Lugares',
        title: 'Sofá Retrátil Madri 3 Lugares',
        description: 'Sofá retrátil e reclinável com molas ensacadas.',
        category: 'Sala de Estar',
        brand: 'Móveis Morante',
        line: 'Linha Conforto',
        condition: 'Novo',
        unit_price: 2499.0,
        promo_price: 2199.0,
        cost_price: 1300.0, // Custo NUNCA deve ser retornado pelo backend
        stock: 4,
        unit: 'UN',
        height: 105,
        width: 220,
        depth: 110,
        weight: 65,
        images: ['https://storage.morante.com/sofa-madri-1.jpg'],
        deleted: false,
        active: true,
      },
    ];

    const mockSupabase: any = {
      _insertedMessages: insertedMessages,
      _conversationUpdates: conversationUpdates,
      _getConfig: () => currentConfig,
      _setConfig: (newCfg: Partial<WhatsAppAiAgentConfig>) => {
        currentConfig = { ...currentConfig, ...newCfg };
      },
      from: vi.fn((table: string) => {
        if (table === 'settings') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockImplementation(async () => ({
              data: {
                data: {
                  whatsappAiAgent: currentConfig,
                  whatsappConfig: {
                    accessToken: 'token-meta-test',
                    phoneNumberId: 'phone-biz-test',
                  },
                },
              },
              error: null,
            })),
          };
        }

        if (table === 'whatsapp_conversations') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockImplementation(async () => ({
              data: convState,
              error: null,
            })),
            update: vi.fn((payload: any) => {
              conversationUpdates.push(payload);
              convState = { ...convState, ...payload };
              return {
                eq: vi.fn().mockResolvedValue({ error: null }),
              };
            }),
          };
        }

        if (table === 'whatsapp_messages') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockReturnThis(),
            limit: vi.fn().mockResolvedValue({ data: [], error: null }),
            insert: vi.fn((payload: any) => {
              insertedMessages.push(payload);
              return { error: null };
            }),
          };
        }

        if (table === 'products') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            gt: vi.fn().mockReturnThis(),
            ilike: vi.fn().mockReturnThis(),
            or: vi.fn().mockReturnThis(),
            limit: vi.fn().mockImplementation(async () => ({
              data: mockProducts,
              error: null,
            })),
            maybeSingle: vi.fn().mockImplementation(async () => ({
              data: mockProducts[0] || null,
              error: null,
            })),
          };
        }

        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnThis(),
          limit: vi.fn().mockResolvedValue({ data: [], error: null }),
        };
      }),
    };

    return { mockSupabase, insertedMessages, conversationUpdates };
  };

  // -------------------------------------------------------------
  // Teste 1: Enviar mensagem perguntando preço de produto real -> consulta ERP e responde com preço correto
  // -------------------------------------------------------------
  it('1. Consulta produto real no ERP, não expõe custo e responde com o preço de venda correto', async () => {
    const { mockSupabase, insertedMessages } = createMockEnvironment();

    const fetchMetaMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ messages: [{ id: 'wamid.out.e2e.101' }] }),
    });

    let toolCallExecuted = false;

    // Simula a chamada da ferramenta na Responses API e a resposta seguinte.
    const fetchOpenAiMock = vi.fn()
      .mockImplementationOnce(async () => {
        toolCallExecuted = true;
        return openAiToolCallResponse('buscarProdutos', { termo: 'Sofá Retrátil Madri' });
      })
      .mockResolvedValueOnce(openAiTextResponse(
        'O Sofá Retrátil Madri 3 Lugares está por R$ 2.199,00 à vista (ou R$ 2.499,00 a prazo). Temos 4 unidades em estoque!'
      ));

    const deps: WhatsAppAiAgentDependencies = {
      fetchOpenAi: fetchOpenAiMock,
      fetchMeta: fetchMetaMock,
      openAiApiKey: 'test-openai-key',
    };

    const result = await maybeTriggerWhatsAppAiAgent(mockSupabase, sampleAuthorizedInbound, deps);

    expect(result.executed).toBe(true);
    expect(toolCallExecuted).toBe(true);
    expect(result.toolsUsed).toContain('buscarProdutos');
    expect(result.replyText).toContain('R$ 2.199,00');

    // Confirma envio via Meta API
    expect(fetchMetaMock).toHaveBeenCalledTimes(1);
    const metaBody = JSON.parse(fetchMetaMock.mock.calls[0][1].body);
    expect(metaBody.to).toBe(authorizedPhone);
    expect(metaBody.text.body).toContain('R$ 2.199,00');

    // Confirma gravação de auditoria no banco
    expect(insertedMessages.length).toBe(1);
    const saved = insertedMessages[0];
    expect(saved.direction).toBe('outbound');
    expect(saved.raw_payload.origin).toBe('customer_support_ai_agent');
    expect(saved.raw_payload.tools_used).toContain('buscarProdutos');

    // Blindagem de custos: garante que cost_price não foi vazado nem no payload nem na resposta
    expect(JSON.stringify(saved)).not.toContain('1300');
    expect(result.replyText).not.toContain('1300');
  });

  // -------------------------------------------------------------
  // Teste 2: Pergunta sobre parcelamento e entrega -> combina política e evita contradições
  // -------------------------------------------------------------
  it('2. Responde sobre parcelamento e entrega sem gerar afirmações falsas ou contraditórias', async () => {
    const { mockSupabase } = createMockEnvironment();

    const fetchMetaMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ messages: [{ id: 'wamid.out.e2e.102' }] }),
    });

    const fetchOpenAiMock = vi.fn().mockResolvedValue(openAiTextResponse(
      'Parcelamos em até 10x sem juros no cartão ou com desconto especial à vista no Pix! O frete é grátis para entregas a até 5 km da nossa loja em Colombo.'
    ));

    const inboundDeliveryAndPayment: InboundMessageParams = {
      ...sampleAuthorizedInbound,
      text: 'Como funciona o parcelamento no cartão e a entrega de vocês?',
      wamid: 'wamid.e2e.002',
    };

    const deps: WhatsAppAiAgentDependencies = {
      fetchOpenAi: fetchOpenAiMock,
      fetchMeta: fetchMetaMock,
      openAiApiKey: 'test-openai-key',
    };

    const result = await maybeTriggerWhatsAppAiAgent(mockSupabase, inboundDeliveryAndPayment, deps);

    expect(result.executed).toBe(true);
    expect(result.situationDetected).toBe('consulta_formas_pagamento');
    expect(result.replyText).toContain('10x sem juros');
    expect(result.replyText).toContain('Pix');
    expect(result.knowledgeArticlesUsed?.length).toBeGreaterThan(0);
  });

  // -------------------------------------------------------------
  // Teste 3: Solicitar atendente humano e confirmar que a IA parou
  // -------------------------------------------------------------
  it('3. Solicitação de atendente humano aciona tag "atendimento_humano" e para de responder em turnos futuros', async () => {
    const { mockSupabase, conversationUpdates } = createMockEnvironment();

    const fetchMetaMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ messages: [{ id: 'wamid.out.e2e.103' }] }),
    });

    const fetchOpenAiMock = vi.fn().mockResolvedValue(openAiTextResponse(
      'Com certeza! Já estou acionando nossa equipe de atendimento para continuar com você.'
    ));

    const inboundHandoff: InboundMessageParams = {
      ...sampleAuthorizedInbound,
      text: 'Quero falar com um atendente humano por favor',
      wamid: 'wamid.e2e.003',
    };

    const deps: WhatsAppAiAgentDependencies = {
      fetchOpenAi: fetchOpenAiMock,
      fetchMeta: fetchMetaMock,
      openAiApiKey: 'test-openai-key',
    };

    // Turno 1: Cliente pede atendente humano
    const resTurn1 = await maybeTriggerWhatsAppAiAgent(mockSupabase, inboundHandoff, deps);
    expect(resTurn1.executed).toBe(true);
    expect(resTurn1.situationDetected).toBe('solicitacao_atendente');

    // Confirma que a tag 'atendimento_humano' foi persistida na conversa
    const updatedTagCall = conversationUpdates.find((u) => u.tags?.includes('atendimento_humano'));
    expect(updatedTagCall).toBeDefined();

    // Turno 2: Cliente envia nova mensagem na mesma conversa após o handoff
    const inboundTurn2: InboundMessageParams = {
      ...sampleAuthorizedInbound,
      text: 'Ainda estou esperando o atendente...',
      wamid: 'wamid.e2e.004',
    };

    const resTurn2 = await maybeTriggerWhatsAppAiAgent(mockSupabase, inboundTurn2, deps);

    // O assistente DEVE parar de responder automaticamente para não interferir no atendente
    expect(resTurn2.executed).toBe(false);
    expect(resTurn2.reason).toBe('handoff_to_human_active');
    expect(fetchMetaMock).toHaveBeenCalledTimes(1); // Não disparou envio novo no turno 2
  });

  // -------------------------------------------------------------
  // Teste 4: Desativação do agente durante uma resposta pendente
  // -------------------------------------------------------------
  it('4. Revalidação antes do envio detecta desativação da IA durante processamento e aborta envio', async () => {
    const { mockSupabase } = createMockEnvironment();

    const fetchMetaMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ messages: [{ id: 'wamid.out.e2e.104' }] }),
    });

    // Simula que durante a execução do modelo o operador desativou a IA.
    const fetchOpenAiMock = vi.fn().mockImplementation(async () => {
      mockSupabase._setConfig({ enabled: false });
      return openAiTextResponse('Resposta gerada que não deve ser enviada');
    });

    const deps: WhatsAppAiAgentDependencies = {
      fetchOpenAi: fetchOpenAiMock,
      fetchMeta: fetchMetaMock,
      openAiApiKey: 'test-openai-key',
    };

    const result = await maybeTriggerWhatsAppAiAgent(mockSupabase, sampleAuthorizedInbound, deps);

    expect(result.executed).toBe(false);
    expect(result.reason).toBe('disabled_during_processing');
    expect(fetchMetaMock).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------
  // Teste 5: Enviar mensagem de outro número e confirmar que nenhuma resposta automática foi disparada
  // -------------------------------------------------------------
  it('5. Número NÃO autorizado é rejeitado no backend sem acionar OpenAI nem Meta API', async () => {
    const { mockSupabase, insertedMessages } = createMockEnvironment();

    const fetchMetaMock = vi.fn();
    const fetchOpenAiMock = vi.fn();

    const inboundUnauthorized: InboundMessageParams = {
      ...sampleAuthorizedInbound,
      from: unauthorizedPhone,
      contactPhoneE164: `+${unauthorizedPhone}`,
      text: 'Olá, qual o preço do sofá?',
      wamid: 'wamid.e2e.unauthorized.01',
    };

    const deps: WhatsAppAiAgentDependencies = {
      fetchOpenAi: fetchOpenAiMock,
      fetchMeta: fetchMetaMock,
      openAiApiKey: 'test-openai-key',
    };

    const result = await maybeTriggerWhatsAppAiAgent(mockSupabase, inboundUnauthorized, deps);

    expect(result.executed).toBe(false);
    expect(result.reason).toBe('unauthorized_phone_number');
    expect(fetchOpenAiMock).not.toHaveBeenCalled();
    expect(fetchMetaMock).not.toHaveBeenCalled();
    expect(insertedMessages.length).toBe(0);
  });

  // -------------------------------------------------------------
  // Teste 6: Atendimento assistido salva sugestão no banco para aprovação do funcionário
  // -------------------------------------------------------------
  it('6. Modo assistido: persiste sugestão de resposta para aprovação do atendente e não envia na Meta API', async () => {
    const { mockSupabase, insertedMessages } = createMockEnvironment({
      config: { supportMode: 'assistido' },
    });

    const fetchMetaMock = vi.fn();
    const fetchOpenAiMock = vi.fn().mockResolvedValue(openAiTextResponse(
      'Sugestão: Temos o Sofá Madri a pronta entrega por R$ 2.199,00!'
    ));

    const deps: WhatsAppAiAgentDependencies = {
      fetchOpenAi: fetchOpenAiMock,
      fetchMeta: fetchMetaMock,
      openAiApiKey: 'test-openai-key',
    };

    const result = await maybeTriggerWhatsAppAiAgent(mockSupabase, sampleAuthorizedInbound, deps);

    expect(result.executed).toBe(true);
    expect(result.supportMode).toBe('assistido');
    expect(result.reason).toBe('assisted_mode_suggested');
    expect(fetchMetaMock).not.toHaveBeenCalled(); // Não despachou direto na Meta

    expect(insertedMessages.length).toBe(1);
    const suggestedMsg = insertedMessages[0];
    expect(suggestedMsg.status).toBe('suggested');
    expect(suggestedMsg.raw_payload.is_suggestion).toBe(true);
    expect(suggestedMsg.raw_payload.author_name).toContain('Sugestão');
  });

  // -------------------------------------------------------------
  // Teste 7: Prevenção contra afirmação falsa de frete grátis em cotações específicas
  // -------------------------------------------------------------
  it('7. Prevenção de conflito: não injeta frete grátis genérico quando a IA já cotou taxa específica para distância', async () => {
    const { mockSupabase } = createMockEnvironment();

    const fetchMetaMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ messages: [{ id: 'wamid.out.e2e.107' }] }),
    });

    // A resposta simulada informa a taxa específica da distância.
    const fetchOpenAiMock = vi.fn().mockResolvedValue(openAiTextResponse(
      'Para o seu endereço, a taxa de entrega é de R$ 60,00 com prazo de 2 dias úteis.'
    ));

    const inboundDistantDelivery: InboundMessageParams = {
      ...sampleAuthorizedInbound,
      text: 'Qual o valor do frete para 15 km de distância?',
      wamid: 'wamid.e2e.007',
    };

    const deps: WhatsAppAiAgentDependencies = {
      fetchOpenAi: fetchOpenAiMock,
      fetchMeta: fetchMetaMock,
      openAiApiKey: 'test-openai-key',
    };

    const result = await maybeTriggerWhatsAppAiAgent(mockSupabase, inboundDistantDelivery, deps);

    expect(result.executed).toBe(true);
    // Não deve conter a afirmação conflitante de frete grátis
    expect(result.replyText).not.toContain('O frete é grátis');
    expect(result.replyText).toContain('taxa de entrega é de R$ 60,00');
  });
});
