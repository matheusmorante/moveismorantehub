import { beforeEach, describe, expect, it, vi } from 'vitest';

const rpc = vi.hoisted(() => vi.fn());
vi.mock('../supabaseClient', () => ({ supabase: { rpc } }));
vi.mock('../financial/mobileCategoryService', () => ({
  fetchFinancialCategories: vi.fn().mockResolvedValue([]),
  fetchFinancialCategoriesForAgent: vi.fn().mockResolvedValue([]),
}));
vi.mock('../financial/mobileTransactionCrudService', () => ({
  deleteFinancialTransaction: vi.fn(),
  updateFinancialTransaction: vi.fn(),
  createFinancialTransaction: vi.fn(),
}));
vi.mock('../../features/finance/components/transactionModalUtils', () => ({
  VEHICLES: [],
  isProLaboreCat: vi.fn(() => false),
  buildIncomeCategories: vi.fn((categories) => categories),
}));

import { mobileAgentFinanceTools } from './mobileAgentFinanceTools';

describe('ferramentas financeiras do assistente mobile', () => {
  beforeEach(() => rpc.mockReset());

  it('envia o período informado ao resumo mensal e usa data final exclusiva', async () => {
    rpc.mockResolvedValueOnce({ data: { income: 800, expense: 300 }, error: null });

    const result = await mobileAgentFinanceTools.obterResumoFinanceiro({
      dataInicio: '2026-11-03',
      dataFim: '2026-11-08',
    });

    expect(result.success).toBe(true);
    expect(result.data).toMatchObject({
      periodo: { inicio: '2026-11-03', fim: '2026-11-08' },
      totalEntradas: 800,
      totalSaidas: 300,
      saldoPeriodo: 500,
    });
    expect(rpc).toHaveBeenCalledWith('get_mobile_financial_monthly_summary', {
      p_start_date: '2026-11-03',
      p_end_date_exclusive: '2026-11-09',
    });
  });

  it('recusa período invertido ou data inexistente antes de consultar o servidor', async () => {
    const reversed = await mobileAgentFinanceTools.obterResumoFinanceiro({
      dataInicio: '2026-11-09',
      dataFim: '2026-11-08',
    });
    const impossible = await mobileAgentFinanceTools.obterResumoFinanceiro({
      dataInicio: '2026-02-30',
    });

    expect(reversed.success).toBe(false);
    expect(impossible.success).toBe(false);
    expect(rpc).not.toHaveBeenCalled();
  });

  it('consulta contas a pagar com filtros de fornecedor, período e status no RPC do servidor', async () => {
    rpc.mockResolvedValueOnce({ data: { total_count: 1, items: [] }, error: null });

    const result = await mobileAgentFinanceTools.buscarContasAPagar({
      fornecedor: 'Café Central',
      dataVencimentoInicio: '2026-11-01',
      dataVencimentoFim: '2026-11-30',
      apenasPendentes: false,
      limite: 12,
    });

    expect(result.success).toBe(true);
    expect(rpc).toHaveBeenCalledWith('get_mobile_finance_assistant_payables', {
      p_supplier: 'Café Central',
      p_start_due_date: '2026-11-01',
      p_end_due_date: '2026-11-30',
      p_only_pending: false,
      p_limit: 12,
    });
  });

  it('não executa a busca de contas a pagar com datas inválidas', async () => {
    const result = await mobileAgentFinanceTools.buscarContasAPagar({
      dataVencimentoInicio: '2026-11-30',
      dataVencimentoFim: '2026-11-01',
    });

    expect(result.success).toBe(false);
    expect(result.code).toBe('INVALID_DATE_RANGE');
    expect(rpc).not.toHaveBeenCalled();
  });

  it('filtra contas a receber no servidor e recusa um período inválido', async () => {
    rpc.mockResolvedValueOnce({ data: { total_count: 1, items: [] }, error: null });

    const found = await mobileAgentFinanceTools.buscarContasAReceber({
      cliente: 'José da Silva',
      dataVencimentoInicio: '2026-11-01',
      dataVencimentoFim: '2026-11-30',
      apenasPendentes: false,
      limite: 9,
    });

    expect(found.success).toBe(true);
    expect(rpc).toHaveBeenCalledWith('get_finance_assistant_receivables', {
      p_search: 'José da Silva',
      p_start_due_date: '2026-11-01',
      p_end_due_date: '2026-11-30',
      p_only_pending: false,
      p_limit: 9,
    });

    rpc.mockReset();
    const invalid = await mobileAgentFinanceTools.buscarContasAReceber({
      dataVencimentoInicio: '2026-11-30',
      dataVencimentoFim: '2026-11-01',
    });
    expect(invalid.success).toBe(false);
    expect(invalid.code).toBe('INVALID_DATE_RANGE');
    expect(rpc).not.toHaveBeenCalled();
  });
});
