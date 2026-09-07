import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  saveAgentFeedback,
  listAgentFeedbacks,
  updateAgentFeedbackStatus,
  generateGoldenTestCaseSnippet,
} from '../aiFeedbackService';
import { GeminiToolDispatcher } from '../geminiToolDispatcher';

// Mock do Supabase para teste determinístico e isolado
vi.mock('../../../pages/utils/supabaseConfig', () => {
  const fakeData = [
    {
      id: 'fb-mock-123',
      conversation_id: 'conv-1',
      user_message: 'Eu disse ontem, não hoje',
      agent_response: 'Registrei com data de hoje',
      category: 'wrong_arguments',
      user_complaint: 'Data incorreta no lançamento',
      divergent_field: 'data',
      tool_calls: [],
      severity: 'medium',
      status: 'pending_review',
      source_app: 'ERP',
      created_at: '2026-09-07T12:00:00Z',
    },
  ];

  const createQueryChain = (): any => {
    const chain: any = {
      order: vi.fn(() => chain),
      eq: vi.fn(() => chain),
      limit: vi.fn(() => chain),
      then: (resolve: any) => resolve({ data: fakeData, error: null }),
    };
    return chain;
  };

  return {
    supabase: {
      from: vi.fn(() => ({
        insert: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({
              data: { id: 'fb-mock-123' },
              error: null,
            }),
          })),
        })),
        select: vi.fn(() => createQueryChain()),
        update: vi.fn(() => ({
          eq: vi.fn().mockResolvedValue({
            data: null,
            error: null,
          }),
        })),
      })),
    },
    ecommerceSupabase: {},
  };
});

describe('aiFeedbackService — Telemetria de Qualidade e Auditoria da IA', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve salvar feedback do agente retornando ID gerado', async () => {
    const res = await saveAgentFeedback({
      conversationId: 'session-test-1',
      userMessage: 'Não era dinheiro, era Pix!',
      agentResponse: 'Registrei como Dinheiro',
      category: 'wrong_arguments',
      userComplaint: 'Forma de pagamento divergente',
      divergentField: 'formaPagamento',
      severity: 'medium',
      sourceApp: 'ERP',
    });

    expect(res.success).toBe(true);
    expect(res.id).toBeDefined();
  });

  it('deve listar feedbacks com filtros aplicados', async () => {
    const list = await listAgentFeedbacks({
      status: 'pending_review',
      category: 'wrong_arguments',
    });

    expect(Array.isArray(list)).toBe(true);
  });

  it('deve atualizar status de revisão do feedback', async () => {
    const ok = await updateAgentFeedbackStatus('fb-mock-123', 'confirmed_bug', {
      reviewedBy: 'Matheus Morante',
      reviewNotes: 'Confirmado erro de interpretação da data',
    });

    expect(ok).toBe(true);
  });

  it('deve gerar snippet correto de caso para o goldenDataset', () => {
    const snippet = generateGoldenTestCaseSnippet({
      id: 'fb-test-456',
      conversation_id: 'conv-1',
      user_message: 'Paguei 300 de gasolina ontem',
      agent_response: 'Registrei hoje',
      category: 'wrong_arguments',
      user_complaint: 'Data divergente',
      divergent_field: 'data',
      tool_calls: [],
      severity: 'high',
      status: 'pending_review',
      source_app: 'ERP',
      created_at: '2026-09-07T12:00:00Z',
    });

    expect(snippet).toContain('regression_fb_test_456');
    expect(snippet).toContain('Paguei 300 de gasolina ontem');
    expect(snippet).toContain('wrong_arguments');
  });

  it('deve executar a tool registrarFeedbackAgente através do GeminiToolDispatcher', async () => {
    const dispatchResult = await GeminiToolDispatcher.execute({
      name: 'registrarFeedbackAgente',
      args: {
        categoria: 'wrong_arguments',
        queixaUsuario: 'Você colocou categoria errada',
        campoDivergente: 'categoria',
        severidade: 'medium',
      },
    });

    expect(dispatchResult.record.success).toBe(true);
    expect(dispatchResult.record.label).toBe('Registrando feedback do assistente de IA');
    expect(dispatchResult.functionResponse.response.output.success).toBe(true);
  });
});
