// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getFinancialSummary: vi.fn(),
  getDashboardForecastSummary: vi.fn(),
}));

vi.mock('@/pages/services/financeService', () => ({ financeService: mocks }));
vi.mock('recharts', () => {
  const EmptyChart = () => null;
  return {
    BarChart: EmptyChart,
    Bar: EmptyChart,
    XAxis: EmptyChart,
    YAxis: EmptyChart,
    CartesianGrid: EmptyChart,
    Tooltip: EmptyChart,
    Cell: EmptyChart,
    Legend: EmptyChart,
    ResponsiveContainer: EmptyChart,
  };
});

import FinanceDashboard from '../index';

describe('FinanceDashboard', () => {
  afterEach(cleanup);
  beforeEach(() => {
    mocks.getFinancialSummary.mockReset().mockResolvedValue({
      totalIncome: 100,
      totalExpense: 40,
      balance: 60,
      count: 4,
    });
    mocks.getDashboardForecastSummary.mockReset().mockResolvedValue({
      payables: { pendingTotal: 10, overdueTotal: 5, total: 15, count: 2 },
      receivables: { pendingTotal: 20, overdueTotal: 7, total: 27, count: 2 },
    });
  });

  it('loads current-month totals and includes overdue open balances in compact requests', async () => {
    const { container } = render(<FinanceDashboard />);

    const today = new Date();
    const month = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
    expect(await screen.findByText('A Receber (Previsão)')).not.toBeNull();
    expect(mocks.getFinancialSummary).toHaveBeenCalledTimes(1);
    expect(mocks.getFinancialSummary).toHaveBeenCalledWith(`${month}-01`, expect.any(String));
    expect(mocks.getDashboardForecastSummary).toHaveBeenCalledTimes(1);

    const renderedText = (container.textContent || '').replace(/\u00a0/g, ' ');
    expect(renderedText).toContain('R$ 15,00');
    expect(renderedText).toContain('R$ 27,00');
    expect(renderedText).toContain('2 títulos em aberto');
    expect(renderedText).toContain('2 compromissos em aberto');
    expect(renderedText).toContain('R$ 100,00');
    expect(renderedText).toContain('R$ 40,00');
    expect(renderedText).toContain('R$ 60,00');
  });

  it('shows a retryable error instead of displaying zero balances after a query failure', async () => {
    mocks.getFinancialSummary.mockRejectedValueOnce(new Error('falha simulada'));
    render(<FinanceDashboard />);

    expect((await screen.findByRole('alert')).textContent).toContain(
      'Não foi possível carregar os dados financeiros.'
    );
    expect(screen.queryByText('A Receber (Previsão)')).toBeNull();

    mocks.getFinancialSummary.mockResolvedValueOnce({ totalIncome: 0, totalExpense: 0, balance: 0, count: 0 });
    fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    expect(await screen.findByText('A Receber (Previsão)')).not.toBeNull();
  });
});
