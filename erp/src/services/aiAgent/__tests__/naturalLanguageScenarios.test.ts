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

describe('Cenários de Linguagem Natural e Casos Reais (Seção 20)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setGeminiCustomTransport(null);
  });

  const variacoesCombustivel = [
    'gastei 200 de gasolina',
    'paguei 200 no posto',
    'abasteci por 200',
    'foram duzentos de combustível',
    'paguei ontem 200 no pix de combustível',
  ];

  variacoesCombustivel.forEach((frase) => {
    it(`deve reconhecer corretamente e registrar despesa para a frase: "${frase}"`, async () => {
      (financialAgentTools.buscarCategoriasFinanceiras as any).mockResolvedValueOnce({
        success: true,
        data: [{ id: 'cat-comb', nome: 'Combustível', tipo: 'despesa/saída' }],
      });

      (financialAgentTools.criarMovimentacaoFinanceira as any).mockResolvedValueOnce({
        success: true,
        data: { id: 'tx-1', amount: 200, description: 'Combustível Posto' },
      });

      let step = 0;
      setGeminiCustomTransport(async () => {
        step++;
        if (step === 1) {
          return {
            candidates: [
              {
                content: {
                  role: 'model',
                  parts: [{ functionCall: { name: 'buscarCategoriasFinanceiras', args: { tipo: 'expense' } } }],
                },
              },
            ],
          };
        } else if (step === 2) {
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
                          valor: 200,
                          descricao: 'Combustível',
                          categoriaId: 'cat-comb',
                          formaPagamento: frase.includes('pix') ? 'Pix' : 'Manual',
                        },
                      },
                    },
                  ],
                },
              },
            ],
          };
        } else {
          return {
            candidates: [
              {
                content: {
                  role: 'model',
                  parts: [{ text: 'Lançamento de R$ 200,00 de combustível registrado com sucesso.' }],
                },
              },
            ],
          };
        }
      });

      const { result } = await GeminiAgentService.sendMessage(frase);
      expect(result.executedTools).toHaveLength(2);
      expect(result.executedTools[1].name).toBe('criarMovimentacaoFinanceira');
      expect(result.executedTools[1].args.valor).toBe(200);
      expect(result.answer).toContain('R$ 200,00');
    });
  });

  it('deve lidar com correção do usuário em conversa encadeada ("foi 300", "na verdade 350")', async () => {
    (financialAgentTools.buscarCategoriasFinanceiras as any).mockResolvedValue({
      success: true,
      data: [{ id: 'cat-comb', nome: 'Combustível' }],
    });

    (financialAgentTools.criarMovimentacaoFinanceira as any).mockResolvedValue({
      success: true,
      data: { id: 'tx-1' },
    });

    // Mensagem 1: Paguei 300 de gasolina
    setGeminiCustomTransport(async () => ({
      candidates: [
        {
          content: {
            role: 'model',
            parts: [{ text: 'Você informou R$ 300,00 de gasolina. Deseja confirmar?' }],
          },
        },
      ],
    }));

    const firstTurn = await GeminiAgentService.sendMessage('Paguei 300 de gasolina');
    expect(firstTurn.result.answer).toContain('R$ 300,00');

    // Mensagem 2: na verdade foi 350
    let secondStep = 0;
    setGeminiCustomTransport(async () => {
      secondStep++;
      if (secondStep === 1) {
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
                        valor: 350,
                        descricao: 'Gasolina',
                        categoriaId: 'cat-comb',
                      },
                    },
                  },
                ],
              },
            },
          ],
        };
      } else {
        return {
          candidates: [
            {
              content: {
                role: 'model',
                parts: [{ text: 'Corrigido! Registrei a despesa de R$ 350,00 de gasolina.' }],
              },
            },
          ],
        };
      }
    });

    const secondTurn = await GeminiAgentService.sendMessage('na verdade foi 350', firstTurn.updatedHistory);
    expect(secondTurn.result.executedTools[0].args.valor).toBe(350);
    expect(secondTurn.result.answer).toContain('R$ 350,00');
  });

  it('deve lidar com erro ou indisponibilidade da tool e informar o usuário amigavelmente', async () => {
    (financialAgentTools.buscarCategoriasFinanceiras as any).mockResolvedValueOnce({
      success: false,
      code: 'DB_UNAVAILABLE',
      error: 'Serviço de banco temporariamente inacessível',
    });

    let step = 0;
    setGeminiCustomTransport(async () => {
      step++;
      if (step === 1) {
        return {
          candidates: [
            {
              content: {
                role: 'model',
                parts: [{ functionCall: { name: 'buscarCategoriasFinanceiras', args: {} } }],
              },
            },
          ],
        };
      } else {
        return {
          candidates: [
            {
              content: {
                role: 'model',
                parts: [
                  {
                    text: 'Não consegui acessar as categorias financeiras no momento devido a uma instabilidade no banco de dados. Por favor, tente novamente em instantes.',
                  },
                ],
              },
            },
          ],
        };
      }
    });

    const { result } = await GeminiAgentService.sendMessage('Quais categorias de despesas temos?');
    expect(result.executedTools[0].success).toBe(false);
    expect(result.answer).toContain('instabilidade no banco de dados');
  });
});
