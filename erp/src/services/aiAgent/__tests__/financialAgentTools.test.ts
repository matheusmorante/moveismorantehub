import { describe, it, expect, vi, beforeEach } from 'vitest';
import { financialAgentTools } from '../financialAgentTools';
import { financeService } from '../../../pages/services/financeService';

vi.mock('../../../pages/services/financeService', () => ({
  financeService: {
    getCategories: vi.fn(),
    getTransactions: vi.fn(),
    getFinancialSummary: vi.fn(),
    createTransaction: vi.fn(),
    deleteTransaction: vi.fn(),
    updateTransaction: vi.fn(),
  },
}));

describe('financialAgentTools - Handlers das Ferramentas Financeiras', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve buscar categorias financeiras com sucesso', async () => {
    (financeService.getCategories as any).mockResolvedValueOnce([
      { id: 'cat-1', name: 'Combustível', type: 'expense' },
      { id: 'cat-2', name: 'Venda de Móveis', type: 'income' },
    ]);

    const result = await financialAgentTools.buscarCategoriasFinanceiras({ tipo: 'expense' });
    expect(result.success).toBe(true);
    expect(result.data).toHaveLength(2);
    expect(result.data[0]).toEqual({
      id: 'cat-1',
      nome: 'Combustível',
      tipo: 'despesa/saída',
    });
  });

  it('deve criar uma movimentação financeira válida', async () => {
    (financeService.createTransaction as any).mockResolvedValueOnce({
      id: 'tx-123',
      type: 'expense',
      amount: 230,
      description: 'Gasolina Fiorino',
      date: '2026-09-07',
      payment_method: 'Pix',
      category_id: 'cat-1',
    });

    const result = await financialAgentTools.criarMovimentacaoFinanceira({
      tipo: 'expense',
      valor: 230,
      descricao: 'Gasolina Fiorino',
      categoriaId: 'cat-1',
      formaPagamento: 'Pix',
    });

    expect(result.success).toBe(true);
    expect(result.data.id).toBe('tx-123');
    expect(financeService.createTransaction).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'expense',
        amount: 230,
        description: 'Gasolina Fiorino',
        category_id: 'cat-1',
        payment_method: 'Pix',
      })
    );
  });

  it('deve rejeitar criação com valor zero ou negativo', async () => {
    const result = await financialAgentTools.criarMovimentacaoFinanceira({
      tipo: 'expense',
      valor: -50,
      descricao: 'Valor inválido',
    });

    expect(result.success).toBe(false);
    expect(result.code).toBe('INVALID_AMOUNT');
    expect(financeService.createTransaction).not.toHaveBeenCalled();
  });

  it('deve rejeitar criação com descrição vazia', async () => {
    const result = await financialAgentTools.criarMovimentacaoFinanceira({
      tipo: 'income',
      valor: 100,
      descricao: '',
    });

    expect(result.success).toBe(false);
    expect(result.code).toBe('INVALID_DESCRIPTION');
  });

  it('deve buscar e filtrar movimentações por termo e tipo', async () => {
    (financeService.getTransactions as any).mockResolvedValueOnce([
      { id: '1', type: 'expense', amount: 230, description: 'Posto Shell Gasolina Fiorino', payment_method: 'Pix' },
      { id: '2', type: 'income', amount: 1500, description: 'Venda Sofá Retrátil', payment_method: 'Cartão de Crédito' },
    ]);

    const result = await financialAgentTools.buscarMovimentacoesFinanceiras({
      termo: 'fiorino',
      tipo: 'expense',
    });

    expect(result.success).toBe(true);
    expect(result.data).toHaveLength(1);
    expect(result.data[0].id).toBe('1');
  });

  it('deve obter resumo financeiro do período', async () => {
    (financeService.getFinancialSummary as any).mockResolvedValueOnce({
      totalIncome: 10000,
      totalExpense: 4000,
      balance: 6000,
      count: 15,
    });

    const result = await financialAgentTools.obterResumoFinanceiro({
      dataInicio: '2026-09-01',
      dataFim: '2026-09-07',
    });

    expect(result.success).toBe(true);
    expect(result.data.saldoPeriodo).toBe(6000);
    expect(result.data.totalEntradas).toBe(10000);
    expect(result.data.totalSaidas).toBe(4000);
  });

  it('deve cancelar/excluir uma movimentação financeira existente', async () => {
    (financeService.deleteTransaction as any).mockResolvedValueOnce({ id: 'tx-123' });

    const result = await financialAgentTools.cancelarOuExcluirMovimentacaoFinanceira({
      movimentacaoId: 'tx-123',
      justificativa: 'Lançado duplicado',
    });

    expect(result.success).toBe(true);
    expect(financeService.deleteTransaction).toHaveBeenCalledWith('tx-123');
  });
});
