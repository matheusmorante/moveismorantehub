import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  rpc: vi.fn(),
  from: vi.fn(),
  pages: [[{ id: '' }]],
  rangeCalls: [[0, 0]],
  statusFilters: [''],
  dateFilters: [['', '']],
  selectColumns: [''],
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
    mocks.selectColumns.length = 0;
    mocks.failingPage = -1;
    mocks.queryError = new Error('falha financeira simulada');
    mocks.from.mockReset().mockImplementation(() => {
      let pageIndex = -1;
      const query: any = {
        select: vi.fn((columns: string) => { mocks.selectColumns.push(columns); return query; }),
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

  it('loads one fixed server page of payables with status and search filters', async () => {
    const items = [{ id: 'payable-1' }];
    mocks.rpc.mockResolvedValueOnce({ data: { items, total_count: 501 }, error: null });

    const result = await financeService.getPayables('pending', 'cafe energia', 2);

    expect(result).toEqual({ items, total_count: 501 });
    expect(mocks.rpc).toHaveBeenCalledWith('get_finance_payables_page', {
      p_status: 'pending',
      p_search: 'cafe energia',
      p_page: 2,
    });
    expect(mocks.from).not.toHaveBeenCalled();
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
      category_id: 'category-aporte',
    }));
    const lastTransaction = {
      id: 'transaction-after-first-page',
      type: 'income',
      amount: 25,
      category_id: 'category-vendas',
    };
    mocks.pages = [firstPage, [lastTransaction]];

    const rows = await financeService.getTransactions('2026-01-01', '2026-12-31', [
      { id: 'category-aporte', name: 'Aporte de sócio', type: 'income' },
      { id: 'category-vendas', name: 'Venda', type: 'income' },
    ]);

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
    expect(mocks.selectColumns[0]).toContain('category_name');
    expect(mocks.selectColumns[0]).not.toContain('financial_categories(');
  });

  it('gets one server-filtered transaction page with its aggregate totals', async () => {
    mocks.rpc.mockResolvedValue({
      data: {
        rows: [{ id: 'transaction-1', type: 'expense', amount: '25.5', description: 'Compra de mercadorias' }],
        total_count: 31,
        income_total: '100.00',
        expense_total: '75.50',
      },
      error: null,
    });

    const result = await financeService.getTransactionPage({
      type: 'expense', categoryId: 'category-1', paymentMethod: 'PIX', accountId: 'Caixa Geral', search: 'mercadorias compra',
    }, 2);

    expect(mocks.rpc).toHaveBeenCalledWith('get_financial_transaction_page', {
      p_start_date: null,
      p_end_date: null,
      p_type: 'expense',
      p_category_id: 'category-1',
      p_payment_method: 'PIX',
      p_account_id: 'Caixa Geral',
      p_created_by: null,
      p_search: 'mercadorias compra',
      p_limit: 15,
      p_offset: 15,
    });
    expect(result).toMatchObject({
      rows: [{ id: 'transaction-1', amount: 25.5 }],
      total_count: 31,
      income_total: 100,
      expense_total: 75.5,
    });
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
