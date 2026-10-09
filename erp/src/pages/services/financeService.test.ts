import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ rpc: vi.fn() }));

vi.mock('@/pages/utils/supabaseConfig', () => ({ supabase: { rpc: mocks.rpc } }));

import { financeService } from './financeService';

describe('consultas financeiras de relatórios', () => {
  beforeEach(() => vi.clearAllMocks());

  it('busca transações de relatório pelo RPC filtrado no servidor', async () => {
    mocks.rpc.mockResolvedValue({ data: [{ amount: 125, type: 'income' }], error: null });

    const rows = await financeService.getReportTransactions('2026-10-01', '2026-10-31');

    expect(mocks.rpc).toHaveBeenCalledWith('get_report_financial_transactions', {
      p_start_date: '2026-10-01',
      p_end_date: '2026-10-31',
      p_end_exclusive: false,
    });
    expect(rows).toHaveLength(1);
  });

  it('mantém o resumo financeiro fora da consulta operacional de movimentações', async () => {
    mocks.rpc.mockResolvedValue({
      data: [
        { amount: 300, type: 'income' },
        { amount: 80, type: 'expense' },
      ],
      error: null,
    });

    await expect(financeService.getFinancialSummary('2026-10-01', '2026-10-31')).resolves.toEqual({
      totalIncome: 300,
      totalExpense: 80,
      balance: 220,
      count: 2,
    });
    expect(mocks.rpc).toHaveBeenCalledTimes(1);
    expect(mocks.rpc).toHaveBeenCalledWith('get_report_financial_transactions', {
      p_start_date: '2026-10-01',
      p_end_date: '2026-10-31',
      p_end_exclusive: false,
    });
  });
});
