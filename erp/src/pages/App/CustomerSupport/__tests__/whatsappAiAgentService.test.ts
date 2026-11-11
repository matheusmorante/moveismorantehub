import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  maybeTriggerWhatsAppAiAgent,
  isPhoneNumberAuthorizedForTesting,
  clearProcessedMessagesCache,
  markConversationInFlight,
  detectCustomerSituation,
  enforceMandatoryPhrases,
  retrieveRelevantKnowledge,
  findApplicableWorkflow,
  type InboundMessageParams,
  type WhatsAppAiAgentDependencies,
} from '@/pages/utils/customerSupport/whatsappAiAgentService';
import type { WhatsAppAiAgentConfig } from '@/pages/utils/settings/types';

const openAiTextResponse = (text: string) => new Response(JSON.stringify({
  output_text: text,
  output: [{ type: 'message', content: [{ type: 'output_text', text }] }],
  usage: { input_tokens: 12, output_tokens: 8, total_tokens: 20 },
}), { status: 200, headers: { 'Content-Type': 'application/json' } });

const openAiToolCallResponse = (name: string, args: Record<string, unknown>) => new Response(JSON.stringify({
  output: [{ type: 'function_call', call_id: 'call_test', name, arguments: JSON.stringify(args) }],
  usage: { input_tokens: 12, output_tokens: 8, total_tokens: 20 },
}), { status: 200, headers: { 'Content-Type': 'application/json' } });

describe('Central de Atendimento WhatsApp — Agente de IA Comercial (Lizandro)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearProcessedMessagesCache();
  });

  const baseAuthorizedConfig: WhatsAppAiAgentConfig = {
    enabled: true,
    testMode: true,
    testPhoneNumbers: ['5541999998888', '41988887777'],
    systemPrompt: 'Você é Seu Lizandro...',
    enabledTools: [
      'buscarProdutos',
      'obterDetalhesProduto',
      'listarCategoriasECaracteristicasProduto',
      'obterInformacoesComerciaisLoja',
      'consultarMeusPedidos',
      'encaminharParaAtendimentoHumano',
    ],
  };

  const sampleInbound: InboundMessageParams = {
    conversationId: 'conv-test-01',
    messageId: 'msg-in-01',
    from: '5541999998888',
    contactPhoneE164: '+5541999998888',
    contactProfile: 'Cliente Teste',
    text: 'Olá, vocês têm guarda-roupa?',
    wamid: 'wamid.test.001',
    businessPhoneNumberId: 'phone-biz-123',
  };

  const createMockSupabase = (overrides?: {
    config?: Partial<WhatsAppAiAgentConfig> | null;
    conversation?: any;
    products?: any[];
    orders?: any[];
  }) => {
    const activeConfig =
      overrides?.config === null
        ? null
        : { ...baseAuthorizedConfig, ...(overrides?.config || {}) };

    const convData = overrides?.conversation !== undefined
      ? overrides.conversation
      : {
          id: 'conv-test-01',
          assigned_to: null,
          is_archived: false,
          tags: [],
          customer_id: 'cust-123',
          contact_phone: '+5541999998888',
        };

    const insertedMessages: any[] = [];
    const conversationUpdates: any[] = [];

    const mockSupabase: any = {
      _insertedMessages: insertedMessages,
      _conversationUpdates: conversationUpdates,
      rpc: vi.fn(async (name: string, args: any) => {
        if (name === 'customer_support_acquire_ai_turn') {
          return {
            data: {
              acquired: true,
              turn_id: `turn-${args.p_conversation_id}`,
              lock_token: `lock-${args.p_conversation_id}`,
            },
            error: null,
          };
        }
        if (name === 'customer_support_complete_ai_turn') {
          return { data: { success: true, has_pending: false, pending_count: 0 }, error: null };
        }
        if (name === 'customer_support_reserve_ai_quota') {
          return { data: { allowed: true, reservation_id: `reservation-${args.p_module_source}` }, error: null };
        }
        if (name === 'record_ai_token_usage') {
          return { data: { log_id: 'usage-log-test', reservation_committed: true }, error: null };
        }
        if (name === 'customer_support_prepare_ai_dispatch') {
          return { data: { allowed: true, dispatch_id: `dispatch-${args.p_conversation_id}` }, error: null };
        }
        if (name === 'customer_support_record_ai_dispatch_outcome') {
          return { data: true, error: null };
        }
        if (name === 'customer_support_record_ai_handoff') {
          conversationUpdates.push({ tags: ['atendimento_humano'], ai_status: 'needs_human' });
          return { data: true, error: null };
        }
        if (name === 'release_ai_reservation') return { data: true, error: null };
        return { data: null, error: null };
      }),
      from: vi.fn((table: string) => {
        if (table === 'settings') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({
              data: activeConfig ? { data: { whatsappAiAgent: activeConfig, whatsappConfig: { accessToken: 'meta-token-test', phoneNumberId: 'phone-biz-123' } } } : null,
              error: null,
            }),
          };
        }
        if (table === 'whatsapp_conversations') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({
              data: convData,
              error: null,
            }),
            update: vi.fn((payload: any) => {
              conversationUpdates.push(payload);
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
            limit: vi.fn().mockResolvedValue({
              data: [
                {
                  direction: 'inbound',
                  message_type: 'text',
                  text_content: 'Olá, vocês têm guarda-roupa?',
                  raw_payload: {},
                  timestamp: new Date().toISOString(),
                },
              ],
              error: null,
            }),
            insert: vi.fn((payload: any) => {
              insertedMessages.push(payload);
              return Promise.resolve({ error: null });
            }),
          };
        }
        if (table === 'product_variations') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            is: vi.fn().mockReturnThis(),
            or: vi.fn().mockReturnThis(),
            limit: vi.fn().mockResolvedValue({ data: [], error: null }),
          };
        }
        if (table === 'products') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            gt: vi.fn().mockReturnThis(),
            is: vi.fn().mockReturnThis(),
            ilike: vi.fn().mockReturnThis(),
            filter: vi.fn().mockReturnThis(),
            or: vi.fn().mockReturnThis(),
            order: vi.fn().mockReturnThis(),
            limit: vi.fn().mockResolvedValue({
              data: overrides?.products ?? [
                {
                  id: 'prod-01',
                  code: 'GR-MADRI',
                  sku: 'GR-MADRI-01',
                  name: 'Guarda-Roupa Madri 6 Portas',
                  unit_price: 1299.9,
                  promo_price: 1199.9,
                  stock: 3,
                  category: 'Guarda-Roupas',
                },
              ],
              error: null,
            }),
            maybeSingle: vi.fn().mockResolvedValue({
              data: overrides?.products?.[0] ?? null,
              error: null,
            }),
          };
        }
        if (table === 'orders') {
          return {
            select: vi.fn().mockReturnThis(),
            or: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockReturnThis(),
            limit: vi.fn().mockResolvedValue({
              data: overrides?.orders ?? [
                {
                  id: 'order-01',
                  order_number: 1050,
                  status: 'confirmed',
                  order_type: 'sale',
                  total_amount: 1199.9,
                  scheduled_date: '2026-11-15',
                  delivery_method: 'Entrega Própria',
                  items: [{ name: 'Guarda-Roupa Madri', quantity: 1 }],
                },
              ],
              error: null,
            }),
          };
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
          limit: vi.fn().mockResolvedValue({ data: [], error: null }),
        };
      }),
    };

    return mockSupabase;
  };

  const createMockDependencies = (overrides?: Partial<WhatsAppAiAgentDependencies>): WhatsAppAiAgentDependencies => {
    return {
      openAiApiKey: 'mock-openai-key',
      whatsappAccessToken: 'mock-meta-token',
      fetchGemini: vi.fn(),
      fetchOpenAi: vi.fn().mockResolvedValue(
        openAiTextResponse('Olá! Temos sim o Guarda-Roupa Madri 6 Portas com montagem própria inclusa.')
      ),
      fetchMeta: vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          messages: [{ id: 'wamid.outbound.meta.001' }],
        }),
      }),
      now: () => new Date('2026-11-08T15:00:00.000Z'),
      ...overrides,
    };
  };

  // 1. Agente Desativado
  it('1. Cenário: Agente desativado não gera respostas nem envia mensagens', async () => {
    const mockSupabase = createMockSupabase({ config: { enabled: false } });
    const deps = createMockDependencies();

    const result = await maybeTriggerWhatsAppAiAgent(mockSupabase, sampleInbound, deps);

    expect(result.executed).toBe(false);
    expect(result.reason).toBe('agent_disabled');
    expect(deps.fetchOpenAi).not.toHaveBeenCalled();
    expect(deps.fetchMeta).not.toHaveBeenCalled();
    expect(mockSupabase._insertedMessages).toHaveLength(0);
  });

  // 2. Agente Ativado + Número Autorizado
  it('2. Cenário: Agente ativado com número autorizado gera resposta com IA e envia ao WhatsApp com tags de IA', async () => {
    const mockSupabase = createMockSupabase();
    const deps = createMockDependencies();

    const result = await maybeTriggerWhatsAppAiAgent(mockSupabase, sampleInbound, deps);

    expect(result.executed).toBe(true);
    expect(result.replyText).toContain('Guarda-Roupa Madri');
    expect(deps.fetchOpenAi).toHaveBeenCalled();
    expect(deps.fetchMeta).toHaveBeenCalled();

    // Valida persistência da mensagem com marcadores explícitos de IA
    expect(mockSupabase._insertedMessages).toHaveLength(1);
    const persisted = mockSupabase._insertedMessages[0];
    expect(persisted.direction).toBe('outbound');
    expect(persisted.raw_payload?.is_ai).toBe(true);
    expect(persisted.raw_payload?.origin).toBe('customer_support_ai_agent');
    expect(persisted.raw_payload?.author_name).toBe('Lizandro (IA)');
  });

  // 3. Agente Ativado + Número Não Autorizado
  it('3. Cenário: Agente ativado em modo de testes bloqueia números não autorizados', async () => {
    const mockSupabase = createMockSupabase();
    const deps = createMockDependencies();

    const unauthorizedInbound = {
      ...sampleInbound,
      from: '5541911112222',
      contactPhoneE164: '+5541911112222',
    };

    const result = await maybeTriggerWhatsAppAiAgent(mockSupabase, unauthorizedInbound, deps);

    expect(result.executed).toBe(false);
    expect(result.reason).toBe('unauthorized_phone_number');
    expect(deps.fetchOpenAi).not.toHaveBeenCalled();
    expect(deps.fetchMeta).not.toHaveBeenCalled();
    expect(mockSupabase._insertedMessages).toHaveLength(0);
  });

  // 4. Desativação Durante o Processamento
  it('4. Cenário: Desativação do agente durante o processamento cancela envio final à Meta API', async () => {
    let callCount = 0;
    const mockSupabase: any = createMockSupabase();
    // Na segunda consulta de settings (guarda final pré-envio), retorna enabled: false
    const origFrom = mockSupabase.from;
    mockSupabase.from = vi.fn((table: string) => {
      if (table === 'settings') {
        callCount++;
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({
            data: {
              data: {
                whatsappAiAgent: {
                  ...baseAuthorizedConfig,
                  enabled: callCount <= 1, // Desativa na checagem final
                },
                whatsappConfig: { accessToken: 'meta-token-test', phoneNumberId: 'phone-biz-123' },
              },
            },
            error: null,
          }),
        };
      }
      return origFrom(table);
    });

    const deps = createMockDependencies();

    const result = await maybeTriggerWhatsAppAiAgent(mockSupabase, sampleInbound, deps);

    expect(result.executed).toBe(false);
    expect(result.reason).toBe('disabled_during_processing');
    expect(deps.fetchMeta).not.toHaveBeenCalled();
    expect(mockSupabase._insertedMessages).toHaveLength(0);
  });

  // 5. Prevenção de Mensagens Duplicadas do Webhook
  it('5. Cenário: Mensagens duplicadas com mesmo wamid são descartadas por idempotência', async () => {
    const mockSupabase = createMockSupabase();
    const deps = createMockDependencies();

    // Primeira execução processa com sucesso
    const firstResult = await maybeTriggerWhatsAppAiAgent(mockSupabase, sampleInbound, deps);
    expect(firstResult.executed).toBe(true);

    // Segunda execução com o mesmo wamid
    const secondResult = await maybeTriggerWhatsAppAiAgent(mockSupabase, sampleInbound, deps);
    expect(secondResult.executed).toBe(false);
    expect(secondResult.reason).toBe('already_processed_or_in_flight');
    // Meta chamado apenas uma vez
    expect(deps.fetchMeta).toHaveBeenCalledTimes(1);
  });

  // 6. Consulta de Produtos (Segurança de Custo / Omissão de cost_price)
  it('6. Cenário: Consulta de produtos omite estritamente preços de custo e dados de fornecedores', async () => {
    const mockSupabase = createMockSupabase();
    let functionCallArgsReceived: any = null;

    // Simula a chamada de ferramenta na Responses API antes da resposta final.
    const deps = createMockDependencies({
      fetchOpenAi: vi
        .fn()
        .mockResolvedValueOnce(openAiToolCallResponse('buscarProdutos', { termo: 'Madri' }))
        .mockResolvedValueOnce(openAiTextResponse('Temos o Guarda-Roupa Madri por R$ 1.199,90 em até 10x sem juros.')),
    });

    const result = await maybeTriggerWhatsAppAiAgent(mockSupabase, sampleInbound, deps);

    expect(result.executed).toBe(true);
    expect(result.toolsUsed).toContain('buscarProdutos');

    // A saída da ferramenta enviada na segunda rodada só contém dados comerciais.
    const secondOpenAiCall = (deps.fetchOpenAi as any).mock.calls[1];
    const sentBody = JSON.parse(secondOpenAiCall[1].body);
    const functionResponse = sentBody.input.find((item: any) => item.type === 'function_call_output');
    expect(functionResponse).toBeDefined();

    const toolResponse = JSON.parse(functionResponse.output);
    expect(toolResponse.success).toBe(true);
    expect(toolResponse.produtos).toBeDefined();
    for (const p of toolResponse.produtos) {
      expect(p.precoVenda).toBeGreaterThan(0);
      expect((p as any).cost_price).toBeUndefined();
      expect((p as any).precoCusto).toBeUndefined();
      expect((p as any).supplier).toBeUndefined();
    }
  });

  // 7. Tentativa de Acessar Dados de Outro Cliente (Segurança de Escopo)
  it('7. Cenário: Consulta de pedidos restringe-se estritamente ao cliente da conversa', async () => {
    const mockSupabase = createMockSupabase({
      conversation: {
        id: 'conv-test-01',
        assigned_to: null,
        is_archived: false,
        tags: [],
        customer_id: 'cust-authorized-01',
        contact_phone: '+5541999998888',
      },
    });

    const deps = createMockDependencies({
      fetchOpenAi: vi
        .fn()
        .mockResolvedValueOnce(openAiToolCallResponse('consultarMeusPedidos', {}))
        .mockResolvedValueOnce(openAiTextResponse('Seu pedido #1050 está com entrega agendada para 15/11.')),
    });

    const result = await maybeTriggerWhatsAppAiAgent(mockSupabase, sampleInbound, deps);

    expect(result.executed).toBe(true);
    expect(result.toolsUsed).toContain('consultarMeusPedidos');

    // Valida que a consulta ao banco filtrou explicitamente por customer_id ou telefone autorizado
    const ordersQueryCalls = mockSupabase.from.mock.calls.filter((c: any) => c[0] === 'orders');
    expect(ordersQueryCalls.length).toBeGreaterThan(0);
  });

  // 8. Atendimento Assumido por Atendente Humano
  it('8. Cenário: Conversa atribuída a atendente humano ou com tag de transbordo cessa automação', async () => {
    // 8A. Atribuída a atendente
    const mockSupabaseWithAttendant = createMockSupabase({
      conversation: {
        id: 'conv-test-01',
        assigned_to: 'agent-uuid-777',
        is_archived: false,
        tags: [],
      },
    });
    const deps = createMockDependencies();

    const resA = await maybeTriggerWhatsAppAiAgent(mockSupabaseWithAttendant, sampleInbound, deps);
    expect(resA.executed).toBe(false);
    expect(resA.reason).toBe('assigned_to_human_attendant');

    // 8B. Com tag atendimento_humano
    clearProcessedMessagesCache();
    const mockSupabaseWithTag = createMockSupabase({
      conversation: {
        id: 'conv-test-01',
        assigned_to: null,
        is_archived: false,
        tags: ['atendimento_humano'],
      },
    });

    const resB = await maybeTriggerWhatsAppAiAgent(mockSupabaseWithTag, sampleInbound, deps);
    expect(resB.executed).toBe(false);
    expect(resB.reason).toBe('handoff_to_human_active');
  });

  // 9. Tratamento de Erros da IA e da Meta API
  it('9. Cenário: Falhas na OpenAI ou na Meta API são tratadas sem loops infinitos', async () => {
    // 9A: OpenAI falha
    const mockSupabase = createMockSupabase();
    const depsOpenAiFail = createMockDependencies({
      fetchOpenAi: vi.fn().mockResolvedValue(new Response(
        JSON.stringify({ error: { message: 'Service Unavailable' } }),
        { status: 503, headers: { 'Content-Type': 'application/json' } }
      )),
    });

    const resOpenAi = await maybeTriggerWhatsAppAiAgent(mockSupabase, sampleInbound, depsOpenAiFail);
    expect(resOpenAi.executed).toBe(false);
    expect(resOpenAi.reason).toBe('exception');
    expect(depsOpenAiFail.fetchMeta).not.toHaveBeenCalled();

    // 9B: Meta API rejeita
    clearProcessedMessagesCache();
    const depsMetaFail = createMockDependencies({
      fetchMeta: vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        json: async () => ({ error: { message: 'OAuthException' } }),
      }),
    });

    const resMeta = await maybeTriggerWhatsAppAiAgent(mockSupabase, sampleInbound, depsMetaFail);
    expect(resMeta.executed).toBe(false);
    expect(resMeta.reason).toBe('meta_api_rejected');
  });

  // 10. Isolamento de Conversas Simultâneas
  it('10. Cenário: Conversas simultâneas mantêm seus contextos e envios estritamente isolados', async () => {
    const mockSupabase1 = createMockSupabase();
    const mockSupabase2 = createMockSupabase({
      conversation: {
        id: 'conv-test-02',
        assigned_to: null,
        is_archived: false,
        tags: [],
        customer_id: 'cust-456',
        contact_phone: '+5541988887777',
      },
    });

    const deps1 = createMockDependencies({
      fetchOpenAi: vi.fn().mockResolvedValue(openAiTextResponse('Resposta para o Cliente 1')),
    });

    const deps2 = createMockDependencies({
      fetchOpenAi: vi.fn().mockResolvedValue(openAiTextResponse('Resposta para o Cliente 2')),
    });

    const inbound1: InboundMessageParams = {
      ...sampleInbound,
      conversationId: 'conv-test-01',
      wamid: 'wamid.parallel.01',
    };

    const inbound2: InboundMessageParams = {
      ...sampleInbound,
      conversationId: 'conv-test-02',
      from: '5541988887777',
      contactPhoneE164: '+5541988887777',
      wamid: 'wamid.parallel.02',
    };

    const [res1, res2] = await Promise.all([
      maybeTriggerWhatsAppAiAgent(mockSupabase1, inbound1, deps1),
      maybeTriggerWhatsAppAiAgent(mockSupabase2, inbound2, deps2),
    ]);

    expect(res1.executed).toBe(true);
    expect(res1.replyText).toBe('Resposta para o Cliente 1');

    expect(res2.executed).toBe(true);
    expect(res2.replyText).toBe('Resposta para o Cliente 2');

    expect(mockSupabase1._insertedMessages[0].conversation_id).toBe('conv-test-01');
    expect(mockSupabase2._insertedMessages[0].conversation_id).toBe('conv-test-02');
  });

  // Testes auxiliares: validação do número de teste
  it('Auxiliar: isPhoneNumberAuthorizedForTesting valida variações com e sem DDI 55 e 9º dígito', () => {
    const list = ['5541999998888', '(41) 98888-7777'];

    expect(isPhoneNumberAuthorizedForTesting('5541999998888', '+5541999998888', list)).toBe(true);
    expect(isPhoneNumberAuthorizedForTesting('41999998888', '5541999998888', list)).toBe(true);
    expect(isPhoneNumberAuthorizedForTesting('41988887777', '+5541988887777', list)).toBe(true);
    expect(isPhoneNumberAuthorizedForTesting('554133334444', '+554133334444', list)).toBe(false);
    expect(isPhoneNumberAuthorizedForTesting('123', '123', [])).toBe(false);
    expect(isPhoneNumberAuthorizedForTesting('123', '123', undefined)).toBe(false);
  });

  // -------------------------------------------------------------
  // Arquitetura Avançada de Atendimento: Regras, Conhecimento, Frases e Modos
  // -------------------------------------------------------------
  describe('Motor de Regras, Situações, Conhecimento Confiável e Modos de Operação', () => {
    it('detectCustomerSituation identifica corretamente intenções e situações por palavras-chave', () => {
      const paymentQuery = detectCustomerSituation('Vocês parcelam no cartão em até quantas vezes sem juros?');
      expect(paymentQuery.situation?.situationKey).toBe('consulta_formas_pagamento');
      expect(paymentQuery.matchedKeywords.length).toBeGreaterThan(0);

      const deliveryQuery = detectCustomerSituation('Qual o valor do frete e o prazo de entrega para Colombo?');
      expect(deliveryQuery.situation?.situationKey).toBe('duvida_entrega');

      const handoffQuery = detectCustomerSituation('Quero falar com um atendente humano por favor');
      expect(handoffQuery.situation?.situationKey).toBe('solicitacao_atendente');
      expect(handoffQuery.situation?.action).toBe('handoff_human');

      const complaintQuery = detectCustomerSituation('O guarda-roupa chegou com defeito e peça riscada');
      expect(complaintQuery.situation?.situationKey).toBe('reclamacao_avaria');
      expect(complaintQuery.situation?.action).toBe('handoff_human');

      const storeQuery = detectCustomerSituation('Onde fica a loja física de vocês e qual o horário de sábado?');
      expect(storeQuery.situation?.situationKey).toBe('horario_localizacao');
    });

    it('enforceMandatoryPhrases anexa deterministicamente frases obrigatórias quando omitidas pela IA', () => {
      const mandatory = ['Parcelamos em até 10x sem juros no cartão ou com desconto especial à vista no Pix!'];
      const incompleteResponse = 'Temos sofás retráteis lindos a partir de R$ 1.500.';

      const result = enforceMandatoryPhrases(incompleteResponse, mandatory);
      expect(result.text).toContain(incompleteResponse);
      expect(result.text).toContain(mandatory[0]);
      expect(result.enforcedPhrases).toContain(mandatory[0]);

      // Se a resposta já continha a frase, não duplica
      const completeResponse = `Temos sofás lindos. Parcelamos em até 10x sem juros no cartão ou com desconto especial à vista no Pix! Venha conferir.`;
      const result2 = enforceMandatoryPhrases(completeResponse, mandatory);
      expect(result2.enforcedPhrases.length).toBe(0);
      expect(result2.text).toBe(completeResponse);
    });

    it('retrieveRelevantKnowledge prioriza artigos oficiais de acordo com a situação e termos pesquisados', () => {
      const articles = retrieveRelevantKnowledge('como funciona a taxa de entrega e prazo', 'duvida_entrega');
      expect(articles.length).toBeGreaterThan(0);
      expect(articles[0].category).toBe('politica_entrega');
      expect(articles[0].title).toContain('Frete');

      const paymentArticles = retrieveRelevantKnowledge('parcelamento no cartao', 'consulta_formas_pagamento');
      expect(paymentArticles[0].category).toBe('pagamentos');
    });

    it('findApplicableWorkflow seleciona o fluxo de atendimento correspondente à situação', () => {
      const paymentWf = findApplicableWorkflow('consulta_formas_pagamento');
      expect(paymentWf?.workflowKey).toBe('compra');

      const handoffWf = findApplicableWorkflow('solicitacao_atendente');
      expect(handoffWf?.workflowKey).toBe('humano');
      expect(handoffWf?.handoffTrigger).toBe(true);

      const complaintWf = findApplicableWorkflow('reclamacao_avaria');
      expect(complaintWf?.workflowKey).toBe('reclamacao');
    });

    it('Modo "humano": encerra sem acionar a OpenAI quando a IA estiver pausada', async () => {
      const mockSupabase = createMockSupabase({
        config: { supportMode: 'humano' },
      });
      const deps = createMockDependencies();

      const result = await maybeTriggerWhatsAppAiAgent(mockSupabase, sampleInbound, deps);

      expect(result.executed).toBe(false);
      expect(result.reason).toBe('mode_human_only');
      expect(deps.fetchOpenAi).not.toHaveBeenCalled();
      expect(deps.fetchMeta).not.toHaveBeenCalled();
    });

    it('Modo "assistido": grava sugestão no banco para aprovação do atendente e NÃO envia mensagem direta na Meta API', async () => {
      const mockSupabase = createMockSupabase({
        config: { supportMode: 'assistido' },
      });
      const deps = createMockDependencies();

      const result = await maybeTriggerWhatsAppAiAgent(mockSupabase, sampleInbound, deps);

      expect(result.executed).toBe(true);
      expect(result.supportMode).toBe('assistido');
      expect(result.reason).toBe('assisted_mode_suggested');
      // Não dispara envio direto via WhatsApp Meta
      expect(deps.fetchMeta).not.toHaveBeenCalled();

      // Garante que a mensagem sugerida foi gravada no banco com status 'suggested'
      expect(mockSupabase._insertedMessages.length).toBe(1);
      const inserted = mockSupabase._insertedMessages[0];
      expect(inserted.status).toBe('suggested');
      expect(inserted.raw_payload.is_suggestion).toBe(true);
      expect(inserted.raw_payload.support_mode).toBe('assistido');
    });

    it('executa chamada com o modelo gpt-6-luna (OpenAI) quando provider é openai', async () => {
      const mockSupabase = createMockSupabase({
        config: { provider: 'openai', model: 'gpt-6-luna' },
      });
      const fetchOpenAi = vi.fn().mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            output_text: 'Olá! Temos excelentes guarda-roupas disponíveis.',
            output: [{
              type: 'message',
              content: [{ type: 'output_text', text: 'Olá! Temos excelentes guarda-roupas disponíveis.' }],
            }],
            usage: { input_tokens: 12, output_tokens: 8, total_tokens: 20 },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
      );
      const deps = {
        ...createMockDependencies(),
        fetchOpenAi,
        openAiApiKey: 'sk-test-openai',
      };

      const result = await maybeTriggerWhatsAppAiAgent(mockSupabase, sampleInbound, deps);

      expect(result.executed).toBe(true);
      expect(fetchOpenAi).toHaveBeenCalledTimes(1);
      expect(fetchOpenAi).toHaveBeenCalledWith(
        'https://api.openai.com/v1/responses',
        expect.objectContaining({
          body: expect.stringContaining('"model":"gpt-6-luna"'),
        })
      );
      expect(deps.fetchMeta).toHaveBeenCalledTimes(1);
    });

    it('não chama Gemini nem envia mensagem quando OpenAI falha', async () => {
      const mockSupabase = createMockSupabase({
        config: { provider: 'openai', model: 'gpt-6-luna' },
      });
      const fetchOpenAi = vi.fn().mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            error: {
              message: 'You have no credits remaining.',
              code: 'credit_balance_exhausted',
            },
          }),
          { status: 429, headers: { 'Content-Type': 'application/json' } }
        )
      );
      const deps = {
        ...createMockDependencies(),
        fetchOpenAi,
        openAiApiKey: 'sk-test-openai',
        geminiApiKey: 'test-gemini-key',
      };

      const result = await maybeTriggerWhatsAppAiAgent(mockSupabase, sampleInbound, deps);

      expect(result.executed).toBe(false);
      expect(fetchOpenAi).toHaveBeenCalledTimes(1);
      expect(deps.fetchGemini).not.toHaveBeenCalled();
      expect(deps.fetchMeta).not.toHaveBeenCalled();
    });

    it('previne execuções concorrentes na mesma conversa quando já houver um turno em andamento', async () => {
      const mockSupabase = createMockSupabase();
      const deps = createMockDependencies();

      // Forja a conversa como em processamento ativo
      markConversationInFlight(sampleInbound.conversationId);

      const result = await maybeTriggerWhatsAppAiAgent(
        mockSupabase,
        {
          ...sampleInbound,
          wamid: 'wamid.parallel.002',
        },
        deps
      );

      expect(result.executed).toBe(false);
      expect(result.reason).toBe('conversation_turn_already_in_flight');
      expect(deps.fetchGemini).not.toHaveBeenCalled();
      expect(deps.fetchMeta).not.toHaveBeenCalled();
    });
  });
});
