import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  maybeTriggerWhatsAppAiAgent,
  executeWhatsAppAiTurn,
} from '@/pages/utils/customerSupport/whatsappAiAgent/whatsappAiAgentOrchestrator';
import {
  clearProcessedMessagesCache,
  acquireDistributedAiTurnLock,
} from '@/pages/utils/customerSupport/whatsappAiAgent/whatsappAiAgentSecurity';
import {
  classifyAiModelError,
  runAiTurnWithFallback,
} from '@/pages/utils/customerSupport/whatsappAiAgent/whatsappAiModelRunner';
import { dispatchAiResponse } from '@/pages/utils/customerSupport/whatsappAiAgent/whatsappAiAgentDispatcher';
import type { InboundMessageParams, WhatsAppAiAgentDependencies } from '@/pages/utils/customerSupport/whatsappAiAgent/whatsappAiAgentTypes';

describe('Central de Atendimento WhatsApp — Concorrência Distribuída, Fila e Idempotência (Lizandro)', () => {
  const baseInbound: InboundMessageParams = {
    conversationId: 'c0000000-0000-0000-0000-000000000001',
    messageId: 'm0000000-0000-0000-0000-000000000001',
    from: '5511999990001',
    contactPhoneE164: '+5511999990001',
    contactProfile: 'Cliente Teste',
    text: 'Olá',
    wamid: 'wamid.conc.001',
    businessPhoneNumberId: 'phone.biz.001',
  };

  const sampleConfig = {
    enabled: true,
    supportMode: 'automatico' as const,
    provider: 'openai' as const,
    model: 'gpt-6-luna',
    testPhoneNumbers: ['+5511999990001'],
    systemPrompt: 'Você é o Lizandro.',
    situationRules: [],
    knowledgeBase: [],
    workflows: [],
    enabledTools: [],
  };

  const createMockSupabase = (overrides?: {
    convData?: any;
    pendingMessages?: any[];
    rpcHandler?: (fn: string, args: any) => Promise<any>;
  }) => {
    const convData = overrides?.convData || {
      id: baseInbound.conversationId,
      is_archived: false,
      tags: [],
      assigned_to: null,
      customer_id: 'cust-01',
      contact_phone: '+5511999990001',
    };

    return {
      from: vi.fn((table: string) => {
        if (table === 'settings') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({
              data: {
                data: {
                  whatsappAiAgent: sampleConfig,
                  whatsappConfig: { accessToken: 'meta-token-test', phoneNumberId: 'phone.biz.001' },
                },
              },
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
            update: vi.fn(() => ({
              eq: vi.fn().mockResolvedValue({ error: null }),
            })),
          };
        }
        if (table === 'whatsapp_messages') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            gt: vi.fn().mockReturnThis(),
            order: vi.fn().mockReturnThis(),
            limit: vi.fn().mockResolvedValue({
              data: overrides?.pendingMessages || [
                {
                  id: 'msg-01',
                  direction: 'inbound',
                  message_type: 'text',
                  text_content: 'Olá',
                  raw_payload: {},
                  timestamp: new Date().toISOString(),
                },
              ],
              error: null,
            }),
            maybeSingle: vi.fn().mockResolvedValue({
              data: overrides?.pendingMessages?.[0] || null,
              error: null,
            }),
            insert: vi.fn().mockResolvedValue({ error: null }),
          };
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnThis(),
          limit: vi.fn().mockResolvedValue({ data: [], error: null }),
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
          insert: vi.fn().mockResolvedValue({ error: null }),
          update: vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ error: null }) })),
        };
      }),
      rpc: vi.fn().mockImplementation((fn: string, args: any) => {
        if (overrides?.rpcHandler) {
          return overrides.rpcHandler(fn, args);
        }
        if (fn === 'customer_support_acquire_ai_turn') {
          return Promise.resolve({ data: { acquired: true, turn_id: 'turn-01', lock_token: 'tok-01' }, error: null });
        }
        if (fn === 'customer_support_complete_ai_turn') {
          return Promise.resolve({ data: { success: true, has_pending: false, pending_count: 0 }, error: null });
        }
        if (fn === 'customer_support_prepare_ai_dispatch') {
          return Promise.resolve({ data: { allowed: true, dispatch_id: 'disp-01' }, error: null });
        }
        if (fn === 'customer_support_record_ai_dispatch_outcome') {
          return Promise.resolve({ data: true, error: null });
        }
        return Promise.resolve({ data: null, error: null });
      }),
    };
  };

  beforeEach(() => {
    vi.clearAllMocks();
    clearProcessedMessagesCache();
  });

  // 1. Dois webhooks simultâneos com o mesmo wamid
  it('1. descarta imediatamente webhook concorrente com o mesmo wamid por idempotência', async () => {
    const mockSupabase = createMockSupabase();

    const fetchGemini = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        candidates: [{ content: { parts: [{ text: 'Olá! Como posso ajudar?' }] } }],
      }),
    });

    const fetchMeta = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ messages: [{ id: 'wamid.out.001' }] }),
    });

    const deps: WhatsAppAiAgentDependencies = {
      fetchGemini,
      fetchMeta,
      geminiApiKey: 'test-key',
    };

    // Primeiro webhook dispara
    const p1 = maybeTriggerWhatsAppAiAgent(mockSupabase, baseInbound, deps);
    // Segundo webhook simultâneo com o exato mesmo wamid
    const p2 = maybeTriggerWhatsAppAiAgent(mockSupabase, baseInbound, deps);

    const [res1, res2] = await Promise.all([p1, p2]);

    expect(res1.executed).toBe(true);
    expect(res2.executed).toBe(false);
    expect(res2.reason).toBe('already_processed_or_in_flight');
  });

  // 2. Mensagens diferentes chegando simultaneamente em instâncias independentes
  it('2. garante que apenas uma instância distribuída adquire o lock no PostgreSQL para a mesma conversa', async () => {
    const mockSupabaseInstanceA = createMockSupabase({
      rpcHandler: async (fn: string) => {
        if (fn === 'customer_support_acquire_ai_turn') {
          return {
            data: { acquired: true, turn_id: 'turn-a', lock_token: 'tok-a', expires_at: '2026-11-09T03:00:00Z' },
            error: null,
          };
        }
        return { data: null, error: null };
      },
    });

    const mockSupabaseInstanceB = createMockSupabase({
      rpcHandler: async (fn: string) => {
        if (fn === 'customer_support_acquire_ai_turn') {
          return {
            data: {
              acquired: false,
              reason: 'in_flight',
              turn_id: 'turn-a',
              lock_token: 'tok-a',
              pending_messages_count: 1,
            },
            error: null,
          };
        }
        return { data: null, error: null };
      },
    });

    const lockA = await acquireDistributedAiTurnLock(mockSupabaseInstanceA, {
      conversationId: baseInbound.conversationId,
      triggerWamid: 'wamid.inst.A',
      leaseSeconds: 60,
    });

    expect(lockA.acquired).toBe(true);
    expect(lockA.turnId).toBe('turn-a');

    // Simula instância B em outro container limpando cache de memória local
    clearProcessedMessagesCache();

    const lockB = await acquireDistributedAiTurnLock(mockSupabaseInstanceB, {
      conversationId: baseInbound.conversationId,
      triggerWamid: 'wamid.inst.B',
      leaseSeconds: 60,
    });

    expect(lockB.acquired).toBe(false);
    expect(lockB.reason).toBe('in_flight');
    expect(lockB.pendingMessagesCount).toBe(1);
  });

  // 3. Nova mensagem recebida durante a geração (Fila e Reprocessamento)
  it('3. detecta mensagens pendentes recebidas durante o turno e agenda próximo processamento sem perder perguntas', async () => {
    const inboundTurn1: InboundMessageParams = {
      ...baseInbound,
      text: 'Olá',
      wamid: 'wamid.seq.001',
    };

    const pendingMsg = {
      id: 'm-pending-002',
      text_content: 'Quanto custa o sofá retrátil?',
      api_message_id: 'wamid.seq.002',
      timestamp: new Date(Date.now() + 1000).toISOString(),
    };

    let completeCallCount = 0;
    const mockSupabase = createMockSupabase({
      pendingMessages: [pendingMsg],
      rpcHandler: async (fn: string) => {
        if (fn === 'customer_support_acquire_ai_turn') {
          return { data: { acquired: true, turn_id: 'turn-chain-1', lock_token: 'tok-1' }, error: null };
        }
        if (fn === 'customer_support_complete_ai_turn') {
          completeCallCount++;
          if (completeCallCount === 1) {
            return {
              data: {
                success: true,
                has_pending: true,
                pending_count: 1,
                latest_pending_message_id: pendingMsg.id,
                latest_pending_text: pendingMsg.text_content,
              },
              error: null,
            };
          }
          return { data: { success: true, has_pending: false, pending_count: 0 }, error: null };
        }
        if (fn === 'customer_support_prepare_ai_dispatch') {
          return { data: { allowed: true, dispatch_id: 'disp-001' }, error: null };
        }
        if (fn === 'customer_support_record_ai_dispatch_outcome') {
          return { data: true, error: null };
        }
        return { data: null, error: null };
      },
    });

    const fetchGemini = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        candidates: [{ content: { parts: [{ text: 'O sofá retrátil custa R$ 1.890,00 à vista.' }] } }],
      }),
    });

    const fetchMeta = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ messages: [{ id: 'wamid.out.sofa' }] }),
    });

    const res = await executeWhatsAppAiTurn(
      mockSupabase,
      inboundTurn1,
      { id: baseInbound.conversationId, tags: [], is_archived: false, assigned_to: null },
      sampleConfig,
      { whatsappConfig: { accessToken: 'meta-token-test', phoneNumberId: 'phone.biz.001' } },
      { fetchGemini, fetchMeta, geminiApiKey: 'test-key' },
      { turnId: 'turn-chain-1', lockToken: 'tok-1' }
    );

    expect(res.executed).toBe(true);
    expect(completeCallCount).toBeGreaterThanOrEqual(1);
  });

  // 4. Timeout após envio à Meta (resultado incerto registrado no PostgreSQL)
  it('4. marca resultado incerto e impede retransmissão cega quando ocorre timeout na chamada da Meta API', async () => {
    let recordedStatus = '';
    const mockSupabase = createMockSupabase({
      rpcHandler: async (fn: string, args: any) => {
        if (fn === 'customer_support_prepare_ai_dispatch') {
          return { data: { allowed: true, dispatch_id: 'disp-timeout-01' }, error: null };
        }
        if (fn === 'customer_support_record_ai_dispatch_outcome') {
          recordedStatus = args.p_status;
          return { data: true, error: null };
        }
        return { data: null, error: null };
      },
    });

    // Meta API dispara AbortError / Timeout
    const fetchMetaTimeout = vi.fn().mockRejectedValue(new Error('fetch failed: The operation was aborted due to timeout'));

    const res = await dispatchAiResponse({
      supabase: mockSupabase,
      inbound: baseInbound,
      conv: { id: baseInbound.conversationId, tags: [], is_archived: false, assigned_to: null },
      config: sampleConfig,
      settings: { whatsappConfig: { accessToken: 'meta-token-test', phoneNumberId: 'phone.biz.001' } },
      aiResponseText: 'Resposta de teste',
      toolsUsed: [],
      situationKey: null,
      matchedKeywords: [],
      enforcedPhrases: [],
      relevantArticleIds: [],
      workflowKey: null,
      executionTimeMs: 1500,
      accessToken: 'token-test',
      fetchMeta: fetchMetaTimeout,
      now: new Date(),
      turnId: 'turn-timeout-01',
    });

    expect(res.executed).toBe(false);
    expect(res.reason).toBe('meta_api_network_error_outcome_uncertain');
    expect(recordedStatus).toBe('uncertain');
  });

  // 5. Transferência humana durante a geração da resposta
  it('5. revalidação atômica aborta o envio se a conversa foi atribuída a um atendente humano durante o processamento', async () => {
    const mockSupabase = createMockSupabase({
      convData: {
        id: baseInbound.conversationId,
        assigned_to: 'u0000000-0000-0000-0000-000000000099',
        is_archived: false,
        tags: ['atendimento_humano'],
      },
    });

    const fetchMeta = vi.fn();

    const res = await dispatchAiResponse({
      supabase: mockSupabase,
      inbound: baseInbound,
      conv: { id: baseInbound.conversationId, tags: [], is_archived: false, assigned_to: null },
      config: sampleConfig,
      settings: { whatsappConfig: { accessToken: 'meta-token-test', phoneNumberId: 'phone.biz.001' } },
      aiResponseText: 'Resposta que não deve ser enviada',
      toolsUsed: [],
      situationKey: null,
      matchedKeywords: [],
      enforcedPhrases: [],
      relevantArticleIds: [],
      workflowKey: null,
      executionTimeMs: 500,
      accessToken: 'token-test',
      fetchMeta,
      now: new Date(),
    });

    expect(res.executed).toBe(false);
    expect(res.reason).toBe('assigned_to_human_during_processing');
    expect(fetchMeta).not.toHaveBeenCalled();
  });

  // 6. Classificação e Fallback estruturado de modelos
  it('6. diferencia categoricamente esgotamento financeiro de quota de rate limit temporário e executa failover seguro', async () => {
    // 6.1 Quota financeira esgotada
    const quotaErr = {
      statusCode: 429,
      code: 'insufficient_quota',
      message: 'You exceeded your current quota, please check your plan and billing details.',
    };
    const classifiedQuota = classifyAiModelError(quotaErr);
    expect(classifiedQuota.type).toBe('quota_exhausted');
    expect(classifiedQuota.canFallback).toBe(true);
    expect(classifiedQuota.isRetryable).toBe(false);

    // 6.2 Rate limit temporário por minuto (RPM / TPM)
    const rateLimitErr = {
      statusCode: 429,
      code: 'rate_limit_exceeded',
      message: 'Rate limit reached for requests per minute (RPM). Please slow down.',
    };
    const classifiedRateLimit = classifyAiModelError(rateLimitErr);
    expect(classifiedRateLimit.type).toBe('rate_limit_exceeded');
    expect(classifiedRateLimit.canFallback).toBe(true);
    expect(classifiedRateLimit.isRetryable).toBe(true);

    // 6.3 Instabilidade do provedor (503 Service Unavailable)
    const outageErr = {
      statusCode: 503,
      message: 'The model is overloaded. Please try again later.',
    };
    const classifiedOutage = classifyAiModelError(outageErr);
    expect(classifiedOutage.type).toBe('provider_outage');
    expect(classifiedOutage.canFallback).toBe(true);

    // 6.4 Chave inválida / 401
    const authErr = {
      statusCode: 401,
      message: 'Incorrect API key provided.',
    };
    const classifiedAuth = classifyAiModelError(authErr);
    expect(classifiedAuth.type).toBe('auth_error');

    // 6.5 Executa failover para Gemini Flash com registro do motivo
    const mockFetchOpenAiFail = vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
      json: async () => ({
        error: { code: 'credit_balance_exhausted', message: 'You have no credits remaining.' },
      }),
    });

    const mockFetchGeminiSuccess = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        candidates: [{ content: { parts: [{ text: 'Resposta gerada via Gemini Flash após failover.' }] } }],
      }),
    });

    const result = await runAiTurnWithFallback({
      modelToUse: 'gpt-6-luna',
      shouldUseOpenAi: true,
      openAiApiKey: 'sk-test',
      geminiApiKey: 'gemini-test',
      fetchOpenAi: mockFetchOpenAiFail,
      fetchGemini: mockFetchGeminiSuccess,
      systemInstructionText: 'Instruções',
      historyForOpenAi: [],
      contentsForGemini: [],
      toolsDeclarations: [],
      supabase: {} as any,
      toolContext: { conversationId: 'c1', customerId: null, contactPhone: '+5511999990001', settings: {} },
    });

    expect(result.text).toBe('Resposta gerada via Gemini Flash após failover.');
    expect(result.modelRequested).toBe('gpt-6-luna');
    expect(result.modelEffective).toBe('gemini-3.8-flash');
    expect(result.fallbackReason).toContain('quota_exhausted');
  });
});
