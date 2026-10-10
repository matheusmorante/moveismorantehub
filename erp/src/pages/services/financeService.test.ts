import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  rpc: vi.fn(),
  from: vi.fn(),
  pages: [[{ id: '' }]],
  rangeCalls: [[0, 0]],
  statusFilters: [''],
  dateFilters: [['', '']],
  failingPage: -1,
  queryError: new Error('falha financeira simulada'),
}));

vi.mock('@/pages/utils/supabaseConfig', () => ({ supabase: { from: mocks.from, rpc: mocks.rpc } }));

import { financeService } from './financeService';

describe('finance list services', () => {
  beforeEach(() => {
    mocks.rpc.mockReset();
    mocks.pages.length = 0;
    mocks.rangeCalls.length = 0;
    mocks.statusFilters.length = 0;
    mocks.dateFilters.length = 0;
    mocks.failingPage = -1;
    mocks.queryError = new Error('falha financeira simulada');
    mocks.from.mockReset().mockImplementation(() => {
      let pageIndex = -1;
      const query: any = {
        select: vi.fn(() => query),
        order: vi.fn(() => query),
        eq: vi.fn((_column: string, value: string) => {
          mocks.statusFilters.push(value);
          return query;
        }),
        gte: vi.fn((column: string, value: string) => {
          mocks.dateFilters.push([column, 'gte', value]);
          return query;
        }),
        lte: vi.fn((column: string, value: string) => {
          mocks.dateFilters.push([column, 'lte', value]);
          return query;
        }),
        range: vi.fn((from: number, to: number) => {
          pageIndex = mocks.rangeCalls.length;
          mocks.rangeCalls.push([from, to]);
          return query;
        }),
        then: (resolve: (value: unknown) => unknown, reject: (reason: unknown) => unknown) => {
          if (pageIndex === mocks.failingPage) {
            return Promise.resolve({ data: null, error: mocks.queryError }).then(resolve, reject);
          }
          return Promise.resolve({ data: mocks.pages[pageIndex] || [], error: null }).then(resolve, reject);
        },
      };
      return query;
    });
  });

  it('paginates payables beyond the PostgREST page cap and preserves the status filter', async () => {
    const firstPage = Array.from({ length: 500 }, (_, index) => ({ id: `payable-${index}` }));
    const lastPayable = { id: 'payable-after-first-page' };
    mocks.pages = [firstPage, [lastPayable]];

    const rows = await financeService.getPayables('pending');

    expect(rows).toHaveLength(501);
    expect(rows.at(-1)).toEqual(lastPayable);
    expect(mocks.rangeCalls).toEqual([[0, 499], [500, 999]]);
    expect(mocks.statusFilters).toEqual(['pending', 'pending']);
  });

  it('propagates query errors from receivables instead of returning a partial list', async () => {
    mocks.failingPage = 0;

    await expect(financeService.getReceivables()).rejects.toBe(mocks.queryError);
    expect(mocks.rangeCalls).toEqual([[0, 499]]);
  });

  it('paginates transactions and reapplies the date interval to every page', async () => {
    const firstPage = Array.from({ length: 500 }, (_, index) => ({
      id: `transaction-${index}`,
      type: 'income',
      amount: 10,
      financial_categories: { name: 'Aporte de sócio' },
    }));
    const lastTransaction = {
      id: 'transaction-after-first-page',
      type: 'income',
      amount: 25,
      financial_categories: { name: 'Venda' },
    };
    mocks.pages = [firstPage, [lastTransaction]];

    const rows = await financeService.getTransactions('2026-01-01', '2026-12-31');

    expect(rows).toHaveLength(501);
    expect(rows.at(-1)).toMatchObject({ id: lastTransaction.id, result_nature: 'RECEITA' });
    expect(rows[0].result_nature).toBe('NAO_AFETA_RESULTADO');
    expect(mocks.rangeCalls).toEqual([[0, 499], [500, 999]]);
    expect(mocks.dateFilters).toEqual([
      ['date', 'gte', '2026-01-01'],
      ['date', 'lte', '2026-12-31'],
      ['date', 'gte', '2026-01-01'],
      ['date', 'lte', '2026-12-31'],
    ]);
  });
});

describe('consultas financeiras de relatórios', () => {
  beforeEach(() => mocks.rpc.mockReset());

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
