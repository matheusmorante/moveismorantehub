import { describe, it, expect, vi, beforeEach } from 'vitest';
import { financialAgentTools } from '../financialAgentTools';
import { financeService } from '../../../pages/services/financeService';
import { supabase } from '@/pages/utils/supabaseConfig';

vi.mock('../../../pages/services/financeService', () => ({
  financeService: {
    getCategories: vi.fn(),
    getTransactions: vi.fn(),
    getFinancialSummary: vi.fn(),
    createTransaction: vi.fn(),
    deleteTransaction: vi.fn(),
    updateTransaction: vi.fn(),
    settleAccount: vi.fn(),
    createPayable: vi.fn(),
    createReceivable: vi.fn(),
  },
}));

vi.mock('@/pages/utils/supabaseConfig', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn(() =>
            Promise.resolve({
              data: { id: 'pay-456', description: 'Conta teste', amount: 100 },
              error: null,
            })
          ),
          single: vi.fn(() =>
            Promise.resolve({ data: { id: 'pay-456', status: 'paid' }, error: null })
          ),
        })),
      })),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: { id: 'pay-789' }, error: null })),
        })),
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn(() =>
              Promise.resolve({ data: { id: 'pay-456', status: 'paid' }, error: null })
            ),
          })),
        })),
      })),
    })),
    auth: {
      getSession: () => Promise.resolve({ data: { session: null }, error: null }),
    },
    rpc: vi.fn(),
  },
}));

vi.mock('../aiFeedbackService', () => ({
  saveAgentFeedback: vi.fn().mockResolvedValue({ success: true, id: 'fb-123' }),
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
        payment_method: 'PIX',
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
    vi.mocked(supabase.rpc).mockResolvedValueOnce({
      data: [
        {
          id: '1',
          type: 'expense',
          amount: 230,
          description: 'Posto Shell Gasolina Fiorino',
          payment_method: 'PIX',
        },
      ],
      error: null,
    } as any);

    const result = await financialAgentTools.buscarMovimentacoesFinanceiras({
      termo: 'fiorino',
      tipo: 'expense',
    });

    expect(result.success).toBe(true);
    expect(result.data).toHaveLength(1);
    expect(result.data[0].id).toBe('1');
    expect(supabase.rpc).toHaveBeenCalledWith('get_finance_assistant_movements', {
      p_search: 'fiorino',
      p_start_date: null,
      p_end_date: null,
      p_type: 'expense',
      p_category_id: null,
      p_limit: 10,
    });
    expect(financeService.getTransactions).not.toHaveBeenCalled();
  });

  it('valida o período de movimentações antes da consulta remota', async () => {
    const result = await financialAgentTools.buscarMovimentacoesFinanceiras({
      dataInicio: '2026-11-31',
      dataFim: '2026-12-01',
    });

    expect(result.success).toBe(false);
    expect(result.code).toBe('INVALID_DATE_RANGE');
    expect(supabase.rpc).not.toHaveBeenCalled();
  });

  it('filtra contas a receber no RPC do servidor e valida as datas antes da consulta', async () => {
    vi.mocked(supabase.rpc).mockResolvedValueOnce({
      data: { total_count: 1, items: [] },
      error: null,
    } as any);

    const found = await financialAgentTools.buscarContasAReceber({
      cliente: 'José da Silva',
      dataVencimentoInicio: '2026-11-01',
      dataVencimentoFim: '2026-11-30',
      apenasPendentes: false,
      limite: 8,
    });
    expect(found.success).toBe(true);
    expect(supabase.rpc).toHaveBeenCalledWith('get_finance_assistant_receivables', {
      p_search: 'José da Silva',
      p_start_due_date: '2026-11-01',
      p_end_due_date: '2026-11-30',
      p_only_pending: false,
      p_limit: 8,
    });

    vi.mocked(supabase.rpc).mockClear();
    const invalid = await financialAgentTools.buscarContasAReceber({
      dataVencimentoInicio: '2026-11-30',
      dataVencimentoFim: '2026-11-01',
    });
    expect(invalid.success).toBe(false);
    expect(invalid.code).toBe('INVALID_DATE_RANGE');
    expect(supabase.rpc).not.toHaveBeenCalled();
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

  it('deve registrar feedback do agente chamando saveAgentFeedback', async () => {
    const result = await financialAgentTools.registrarFeedbackAgente({
      categoria: 'wrong_arguments',
      queixaUsuario: 'Falei que era saída e não entrada',
      campoDivergente: 'tipo',
      severidade: 'high',
    });

    expect(result.success).toBe(true);
    expect(result.message).toContain('Feedback registrado com sucesso');
  });

  it('deve dar baixa em conta financeira aceitando tipoConta="pagar" ou "receber" e dataBaixa', async () => {
    (financeService.settleAccount as any).mockResolvedValueOnce({
      success: true,
      kind: 'payable',
      settledAt: '2026-11-10',
    });

    const result = await financialAgentTools.baixarContaFinanceira({
      tipoConta: 'pagar' as any,
      contaId: 'pay-456',
      dataBaixa: '2026-11-10',
      formaPagamento: 'PIX',
    });

    expect(result.success).toBe(true);
    expect(financeService.settleAccount).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: 'payable',
        account: expect.objectContaining({
          id: 'pay-456',
          date: '2026-11-10',
          payment_method: 'PIX',
        }),
      })
    );
  });

  it('deve dar baixa em conta financeira aceitando aliases resilientes (conta_id, tipo_conta="despesa", data_pagamento)', async () => {
    (financeService.settleAccount as any).mockResolvedValueOnce({
      success: true,
      kind: 'payable',
      settledAt: '2026-11-12',
    });

    const result = await financialAgentTools.baixarContaFinanceira({
      tipo_conta: 'despesa',
      conta_id: 'pay-777',
      data_pagamento: '2026-11-12',
      forma_pagamento: 'Dinheiro',
    } as any);

    expect(result.success).toBe(true);
    expect(financeService.settleAccount).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: 'payable',
        account: expect.objectContaining({
          id: 'pay-777',
          date: '2026-11-12',
          payment_method: 'Dinheiro',
        }),
      })
    );
  });

  it('deve criar conta a pagar aceitando fornecedorNome conforme schema de declaração', async () => {
    (financeService.createPayable as any).mockResolvedValueOnce({
      id: 'pay-789',
      description: 'Madeira MDF',
      amount: 1500,
      due_date: '2026-12-01',
      supplier_name: 'Madeireira Silva',
    });

    const result = await financialAgentTools.criarContaAPagar({
      descricao: 'Madeira MDF',
      valor: 1500,
      dataVencimento: '2026-12-01',
      fornecedorNome: 'Madeireira Silva',
      formaPagamento: 'Boleto',
    });

    expect(result.success).toBe(true);
    expect(financeService.createPayable).toHaveBeenCalledWith(
      expect.objectContaining({
        description: 'Madeira MDF',
        amount: 1500,
        supplier_name: 'Madeireira Silva',
      })
    );
  });
});
