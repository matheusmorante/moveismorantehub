import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  evaluateAddressFreight,
  executeSafeTool,
} from '@/pages/utils/customerSupport/whatsappAiAgent/whatsappAiAgentTools';
import { dispatchAiResponse } from '@/pages/utils/customerSupport/whatsappAiAgent/whatsappAiAgentDispatcher';
import {
  DEFAULT_KNOWLEDGE_ARTICLES,
  DEFAULT_SITUATION_RULES,
} from '../../../../../../shared-utils/whatsappAiAgentDefaults';
import { DEFAULT_WHATSAPP_AI_AGENT_PROMPT } from '../../../../../../shared-utils/whatsappAiAgentSchemas';

describe('Central de Atendimento — Regras Comerciais de Frete, Pagamento e Escalonamento Silencioso', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // -------------------------------------------------------------
  // 1. Regras de Frete e Distância
  // -------------------------------------------------------------
  describe('1. Regras de Frete e Distância da Loja Física (< 5 km grátis)', () => {
    it('reconhece endereços e CEPs a menos de 5 km da loja como frete grátis', () => {
      // Mesmo bairro da loja (Guaraituba - Colombo)
      const resGuaraituba = evaluateAddressFreight('Rua Cascavel, Guaraituba, Colombo');
      expect(resGuaraituba.localizado).toBe(true);
      expect(resGuaraituba.freteGratis).toBe(true);
      expect(resGuaraituba.distanciaKm).toBeLessThan(5);

      // CEP da loja em Guaraituba
      const resCepGuaraituba = evaluateAddressFreight('83410-270');
      expect(resCepGuaraituba.localizado).toBe(true);
      expect(resCepGuaraituba.freteGratis).toBe(true);
      expect(resCepGuaraituba.distanciaKm).toBeLessThan(5);

      // Bairros vizinhos de Colombo < 5 km (Maracanã, Arruda)
      const resMaracana = evaluateAddressFreight('Alto Maracanã, Colombo');
      expect(resMaracana.localizado).toBe(true);
      expect(resMaracana.freteGratis).toBe(true);
      expect(resMaracana.distanciaKm).toBeLessThan(5);

      // Bairro limítrofe de Curitiba < 5 km (Santa Cândida / Atuba)
      const resSantaCandida = evaluateAddressFreight('Santa Cândida, Curitiba');
      expect(resSantaCandida.localizado).toBe(true);
      expect(resSantaCandida.freteGratis).toBe(true);
      expect(resSantaCandida.distanciaKm).toBeLessThan(5);
    });

    it('identifica distâncias maiores que 5 km e orienta a solicitar endereço completo', () => {
      // Centro de Curitiba (~14 km)
      const resCentro = evaluateAddressFreight('Centro, Curitiba');
      expect(resCentro.localizado).toBe(true);
      expect(resCentro.freteGratis).toBe(false);
      expect(resCentro.distanciaKm).toBeGreaterThan(5);

      // Batel / CIC / Pinhais
      const resBatel = evaluateAddressFreight('Batel, Curitiba');
      expect(resBatel.localizado).toBe(true);
      expect(resBatel.freteGratis).toBe(false);
      expect(resBatel.distanciaKm).toBeGreaterThan(5);

      // CEP de Curitiba > 5 km
      const resCepCuritiba = evaluateAddressFreight('80020-010');
      expect(resCepCuritiba.localizado).toBe(true);
      expect(resCepCuritiba.freteGratis).toBe(false);
      expect(resCepCuritiba.distanciaKm).toBeGreaterThan(5);
    });

    it('marca como não localizado quando o endereço for inválido, desconhecido ou inconclusivo', () => {
      expect(evaluateAddressFreight('').localizado).toBe(false);
      expect(evaluateAddressFreight('aqui').localizado).toBe(false);
      expect(evaluateAddressFreight('rua teste').localizado).toBe(false);
      expect(evaluateAddressFreight('lugar nenhum').localizado).toBe(false);
      expect(evaluateAddressFreight('00000-000').localizado).toBe(false);
      expect(evaluateAddressFreight('12345').localizado).toBe(false);
    });
  });

  // -------------------------------------------------------------
  // 2. Regras de Pagamento (Cartão 10x sem juros, Senff, sem crediário/boleto)
  // -------------------------------------------------------------
  describe('2. Regras de Pagamento e Condições Comerciais', () => {
    it('obterInformacoesComerciaisLoja retorna estritamente as regras de pagamento e frete vigentes', async () => {
      const mockSupabase: any = {};
      const res = await executeSafeTool(
        mockSupabase,
        'obterInformacoesComerciaisLoja',
        {},
        {
          conversationId: 'simulated_conv_01',
          contactPhone: '5541999999999',
          isSimulation: true,
        }
      );

      expect(res.success).toBe(true);
      expect(res.loja.condicoesFrete).toContain('menos de 5 km');

      const pagamentos = res.loja.formasPagamento.join(' | ');
      // 10x sem juros Visa, Master, Elo, Hiper
      expect(pagamentos).toContain('10x sem juros');
      expect(pagamentos).toContain('Visa');
      expect(pagamentos).toContain('Mastercard');
      expect(pagamentos).toContain('Elo');
      expect(pagamentos).toContain('Hiper');

      // Senff com juros
      expect(pagamentos).toContain('Senff');
      expect(pagamentos).toContain('juros');

      // Crediário e boleto não trabalhados
      expect(pagamentos).toContain('ainda não trabalhamos');
      expect(pagamentos).not.toContain('36x');
    });

    it('base de conhecimento padrão e prompt proíbem crediário e fixam 10x sem juros', () => {
      const kbPagamentos = DEFAULT_KNOWLEDGE_ARTICLES.find((a) => a.id === 'kb_pagamentos_formas');
      expect(kbPagamentos).toBeDefined();
      expect(kbPagamentos?.content).toContain('10x sem juros');
      expect(kbPagamentos?.content).toContain('Visa, Mastercard, Elo e Hiper');
      expect(kbPagamentos?.content).toContain('Senff cobramos juros');
      expect(kbPagamentos?.content).toContain('Ainda não trabalhamos com crediário nem com boleto');
      expect(kbPagamentos?.content).not.toContain('36x');

      const sitPagamento = DEFAULT_SITUATION_RULES.find((s) => s.id === 'sit_formas_pagamento');
      expect(sitPagamento).toBeDefined();
      expect(sitPagamento?.mandatoryPhrases[0]).toContain('10x sem juros');
      expect(sitPagamento?.mandatoryPhrases[0]).toContain('Visa, Master, Elo e Hiper');
      expect(sitPagamento?.mandatoryPhrases[0]).toContain('Senff cobramos juros');
      expect(sitPagamento?.mandatoryPhrases[0]).toContain('Ainda não trabalhamos com crediário ou boleto');

      expect(DEFAULT_WHATSAPP_AI_AGENT_PROMPT).toContain('10x sem juros nas bandeiras Visa, Mastercard, Elo e Hiper');
      expect(DEFAULT_WHATSAPP_AI_AGENT_PROMPT).toContain('No cartão Senff cobramos juros');
      expect(DEFAULT_WHATSAPP_AI_AGENT_PROMPT).toContain('Crediário e boleto bancário: AINDA NÃO TRABALHAMOS');
    });
  });

  // -------------------------------------------------------------
  // 3. Ferramenta calcularFreteOuDistancia e Escalonamento Silencioso
  // -------------------------------------------------------------
  describe('3. Ferramenta calcularFreteOuDistancia e Escalonamento Silencioso', () => {
    it('aciona intervenção humana e pausa a IA quando o endereço não for localizado', async () => {
      const updates: any[] = [];
      const messages: any[] = [];

      const mockSupabase: any = {
        from: vi.fn((table: string) => {
          if (table === 'whatsapp_conversations') {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn().mockResolvedValue({
                data: { tags: [], internal_notes: '', ai_status: 'active' },
                error: null,
              }),
              update: vi.fn((payload: any) => {
                updates.push(payload);
                return { eq: vi.fn().mockResolvedValue({ error: null }) };
              }),
            };
          }
          if (table === 'whatsapp_messages') {
            return {
              insert: vi.fn((payload: any) => {
                messages.push(payload);
                return { error: null };
              }),
            };
          }
          return {};
        }),
      };

      const res = await executeSafeTool(
        mockSupabase,
        'calcularFreteOuDistancia',
        { enderecoOuCep: 'rua inexistente xyz 99999' },
        {
          conversationId: 'real-conv-123',
          contactPhone: '5541999999999',
          isSimulation: false,
        }
      );

      // Retorno da ferramenta exige intervenção silenciosa
      expect(res.localizado).toBe(false);
      expect(res.precisaIntervencao).toBe(true);
      expect(res.silentHandoff).toBe(true);

      // Banco de dados atualizado com ai_status = 'needs_human'
      const convUpdate = updates.find((u) => u.ai_status === 'needs_human');
      expect(convUpdate).toBeDefined();
      expect(convUpdate.tags).toContain('intervencao_necessaria');
      expect(convUpdate.ai_handoff_reason).toContain('não localizou o endereço');

      // Nota interna inserida no chat para os atendentes (message_type = 'internal_note')
      const noteMsg = messages.find((m) => m.message_type === 'internal_note');
      expect(noteMsg).toBeDefined();
      expect(noteMsg.direction).toBe('outbound');
      expect(noteMsg.text_content).toContain('Intervenção humana necessária');
      expect(noteMsg.text_content).toContain('Aviso interno — não enviado ao cliente');
      expect(noteMsg.raw_payload.silent_handoff).toBe(true);
    });

    it('retorna frete grátis quando a distância for menor que 5 km', async () => {
      const mockSupabase: any = {};
      const res = await executeSafeTool(
        mockSupabase,
        'calcularFreteOuDistancia',
        { enderecoOuCep: 'Rua Cascavel, Guaraituba, Colombo/PR' },
        {
          conversationId: 'simulated_conv_02',
          contactPhone: '5541999999999',
          isSimulation: true,
        }
      );

      expect(res.success).toBe(true);
      expect(res.localizado).toBe(true);
      expect(res.freteGratis).toBe(true);
      expect(res.distanciaKm).toBeLessThan(5);
      expect(res.mensagem).toContain('Frete grátis');
    });

    it('retorna distância e orienta solicitar endereço completo quando for maior que 5 km', async () => {
      const mockSupabase: any = {};
      const res = await executeSafeTool(
        mockSupabase,
        'calcularFreteOuDistancia',
        { enderecoOuCep: 'Bairro Centro, Curitiba' },
        {
          conversationId: 'simulated_conv_03',
          contactPhone: '5541999999999',
          isSimulation: true,
        }
      );

      expect(res.success).toBe(true);
      expect(res.localizado).toBe(true);
      expect(res.freteGratis).toBe(false);
      expect(res.distanciaKm).toBeGreaterThan(5);
      expect(res.mensagem).toContain('endereço completo');
    });
  });

  // -------------------------------------------------------------
  // 4. Dispatcher: Escalonamento Silencioso NÃO envia mensagem externa
  // -------------------------------------------------------------
  describe('4. Dispatcher: Escalonamento Silencioso Não Envia Mensagem ao Cliente', () => {
    it('quando encaminharParaAtendimentoHumano é chamado, o Dispatcher NÃO chama a Meta Cloud API', async () => {
      const fetchMetaSpy = vi.fn();
      const mockSupabase: any = {
        from: vi.fn((table: string) => ({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({
            data: {
              assigned_to: null,
              is_archived: false,
              tags: ['atendimento_humano'],
              ai_status: 'needs_human',
            },
            error: null,
          }),
        })),
      };

      const dispatchResult = await dispatchAiResponse({
        supabase: mockSupabase,
        inbound: {
          conversationId: 'conv-silent-01',
          messageId: 'msg-01',
          from: '5541999999999',
          contactPhoneE164: '5541999999999',
          text: 'Qual o valor da entrega para uma fazenda em Bocaiúva?',
          wamid: 'wamid.silent.01',
          businessPhoneNumberId: 'phone-biz-01',
        },
        conv: { id: 'conv-silent-01' },
        config: {
          enabled: true,
          testMode: true,
          testPhoneNumbers: ['5541999999999'],
          supportMode: 'automatico',
          model: 'gpt-6-luna',
          provider: 'openai',
          systemPrompt: 'prompt',
          enabledTools: ['calcularFreteOuDistancia', 'encaminharParaAtendimentoHumano'],
          knowledgeBase: [],
          situationRules: [],
          workflows: [],
        },
        settings: {},
        aiResponseText: 'Texto que NÃO deve ser enviado',
        toolsUsed: ['calcularFreteOuDistancia', 'encaminharParaAtendimentoHumano'],
        situationKey: 'duvida_entrega',
        matchedKeywords: ['entrega'],
        enforcedPhrases: [],
        relevantArticleIds: [],
        workflowKey: 'duvida_entrega',
        executionTimeMs: 120,
        accessToken: 'token-test',
        fetchMeta: fetchMetaSpy,
        now: new Date(),
      });

      expect(dispatchResult.executed).toBe(true);
      expect(dispatchResult.reason).toBe('silent_handoff_no_customer_message');
      // Garantia crítica: NENHUMA chamada para Meta Cloud API (WhatsApp do cliente silencioso)
      expect(fetchMetaSpy).not.toHaveBeenCalled();
    });
  });
});
