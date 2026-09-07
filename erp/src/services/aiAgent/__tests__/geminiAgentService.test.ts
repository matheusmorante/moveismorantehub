import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../../pages/utils/supabaseConfig', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          gte: vi.fn(() => ({
            lte: vi.fn().mockResolvedValue({ data: [], error: null }),
          })),
        })),
      })),
      upsert: vi.fn().mockResolvedValue({ error: null }),
      insert: vi.fn().mockResolvedValue({ error: null }),
    })),
    rpc: vi.fn().mockResolvedValue({ data: 'mock-id', error: null }),
  },
  ecommerceSupabase: {},
}));

import { GeminiAgentService } from '../geminiAgentService';
import { setGeminiCustomTransport } from '../geminiClient';
import { financialAgentTools } from '../financialAgentTools';

vi.mock('../financialAgentTools', () => ({
  financialAgentTools: {
    buscarCategoriasFinanceiras: vi.fn(),
    buscarMovimentacoesFinanceiras: vi.fn(),
    obterResumoFinanceiro: vi.fn(),
    criarMovimentacaoFinanceira: vi.fn(),
    cancelarOuExcluirMovimentacaoFinanceira: vi.fn(),
  },
}));

describe('GeminiAgentService - Agente Conversacional & Loop de Tool Calling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setGeminiCustomTransport(null);
  });

  it('deve processar mensagem de chat comum sem acionar ferramentas', async () => {
    setGeminiCustomTransport(async () => ({
      candidates: [
        {
          content: {
            role: 'model',
            parts: [{ text: 'Olá! Sou Lisandro, posso ajudar com lançamentos financeiros e gestão do ERP.' }],
          },
        },
      ],
    }));

    const { result, updatedHistory } = await GeminiAgentService.sendMessage('Olá, quem é você?');
    expect(result.answer).toContain('Lisandro');
    expect(result.executedTools).toHaveLength(0);
    expect(updatedHistory).toHaveLength(2); // 1 user + 1 model
  });

  it('deve executar chamadas encadeadas de tools com sucesso (consultar categoria -> criar despesa -> responder)', async () => {
    (financialAgentTools.buscarCategoriasFinanceiras as any).mockResolvedValueOnce({
      success: true,
      data: [
        { id: 'cat-comb', nome: 'Combustível e Veículos', tipo: 'despesa/saída' },
        { id: 'cat-alug', nome: 'Aluguel e Condomínio', tipo: 'despesa/saída' },
      ],
    });

    (financialAgentTools.criarMovimentacaoFinanceira as any).mockResolvedValueOnce({
      success: true,
      data: { id: 'tx-999', amount: 230, description: 'Gasolina Fiorino' },
      message: 'Criado com sucesso',
    });

    let callStep = 0;
    setGeminiCustomTransport(async (req) => {
      callStep++;
      if (callStep === 1) {
        // Primeiro passo do Gemini: consultar categorias
        return {
          candidates: [
            {
              content: {
                role: 'model',
                parts: [
                  {
                    functionCall: {
                      name: 'buscarCategoriasFinanceiras',
                      args: { tipo: 'expense' },
                    },
                  },
                ],
              },
            },
          ],
        };
      } else if (callStep === 2) {
        // Segundo passo do Gemini: com as categorias recebidas, criar a movimentação
        return {
          candidates: [
            {
              content: {
                role: 'model',
                parts: [
                  {
                    functionCall: {
                      name: 'criarMovimentacaoFinanceira',
                      args: {
                        tipo: 'expense',
                        valor: 230,
                        descricao: 'Gasolina da Fiorino',
                        categoriaId: 'cat-comb',
                        formaPagamento: 'Pix',
                      },
                    },
                  },
                ],
              },
            },
          ],
        };
      } else {
        // Terceiro passo do Gemini: resposta final em linguagem natural
        return {
          candidates: [
            {
              content: {
                role: 'model',
                parts: [
                  {
                    text: 'Prontinho! Registrei a saída de R$ 230,00 referente ao combustível da Fiorino na categoria Combustível e Veículos com pagamento via Pix.',
                  },
                ],
              },
            },
          ],
        };
      }
    });

    const { result, updatedHistory } = await GeminiAgentService.sendMessage(
      'Paguei 230 de gasolina da Fiorino hoje no Pix'
    );

    expect(result.executedTools).toHaveLength(2);
    expect(result.executedTools[0].name).toBe('buscarCategoriasFinanceiras');
    expect(result.executedTools[1].name).toBe('criarMovimentacaoFinanceira');
    expect(result.answer).toContain('Registrei a saída de R$ 230,00');

    expect(financialAgentTools.buscarCategoriasFinanceiras).toHaveBeenCalledTimes(1);
    expect(financialAgentTools.criarMovimentacaoFinanceira).toHaveBeenCalledWith(
      expect.objectContaining({
        valor: 230,
        categoriaId: 'cat-comb',
        formaPagamento: 'Pix',
      })
    );

    // Verifica alternância correta de turnos no histórico
    // user -> model(call) -> user(response) -> model(call) -> user(response) -> model(text)
    expect(updatedHistory).toHaveLength(6);
  });

  it('deve respeitar a proteção contra loop infinito (máximo 5 iterações)', async () => {
    // Simula modelo que fica em loop chamando tool repetidamente
    setGeminiCustomTransport(async () => ({
      candidates: [
        {
          content: {
            role: 'model',
            parts: [
              {
                functionCall: {
                  name: 'buscarCategoriasFinanceiras',
                  args: {},
                },
              },
            ],
          },
        },
      ],
    }));

    (financialAgentTools.buscarCategoriasFinanceiras as any).mockResolvedValue({
      success: true,
      data: [],
    });

    const { result } = await GeminiAgentService.sendMessage('Loop infinito');
    expect(result.answer).toContain('limite de iterações atingido');
    expect(result.executedTools.length).toBe(5);
  });
});
