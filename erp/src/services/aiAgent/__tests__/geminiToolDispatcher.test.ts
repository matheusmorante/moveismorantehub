import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GeminiToolDispatcher } from '../geminiToolDispatcher';
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

describe('GeminiToolDispatcher - Roteamento de Chamadas de Ferramentas', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve despachar corretamente buscarCategoriasFinanceiras', async () => {
    (financialAgentTools.buscarCategoriasFinanceiras as any).mockResolvedValueOnce({
      success: true,
      data: [{ id: '1', nome: 'Combustível' }],
    });

    const { functionResponse, record } = await GeminiToolDispatcher.execute({
      name: 'buscarCategoriasFinanceiras',
      args: { tipo: 'expense' },
    });

    expect(functionResponse.name).toBe('buscarCategoriasFinanceiras');
    expect(functionResponse.response.output.success).toBe(true);
    expect(record.success).toBe(true);
    expect(record.label).toBe('Consultando categorias financeiras');
  });

  it('deve tratar ferramenta desconhecida sem quebrar', async () => {
    const { functionResponse, record } = await GeminiToolDispatcher.execute({
      name: 'ferramentaInexistente',
      args: {},
    });

    expect(functionResponse.name).toBe('ferramentaInexistente');
    expect(functionResponse.response.output.success).toBe(false);
    expect(record.success).toBe(false);
    expect(record.error).toContain('não encontrada no ERP');
  });

  it('deve capturar exceções não tratadas do handler e retornar erro estruturado', async () => {
    (financialAgentTools.criarMovimentacaoFinanceira as any).mockRejectedValueOnce(
      new Error('Falha de conexão com PostgreSQL')
    );

    const { functionResponse, record } = await GeminiToolDispatcher.execute({
      name: 'criarMovimentacaoFinanceira',
      args: { tipo: 'expense', valor: 50, descricao: 'Teste' },
    });

    expect(functionResponse.response.output.success).toBe(false);
    expect(record.success).toBe(false);
    expect(record.error).toBe('Falha de conexão com PostgreSQL');
  });
});
