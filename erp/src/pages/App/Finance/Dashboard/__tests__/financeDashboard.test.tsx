// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getReportTransactions: vi.fn(),
  getReportPayables: vi.fn(),
  getReportReceivables: vi.fn(),
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
    mocks.getReportTransactions.mockReset().mockResolvedValue([]);
    mocks.getReportPayables.mockReset().mockImplementation(async (status: string) =>
      status === 'pending' ? [{ id: 'pending-payable', amount: 10 }] : [{ id: 'overdue-payable', amount: 5 }]
    );
    mocks.getReportReceivables.mockReset().mockImplementation(async (status: string) =>
      status === 'pending' ? [{ id: 'pending-receivable', amount: 20 }] : [{ id: 'overdue-receivable', amount: 7 }]
    );
  });

  it('loads only current-month transactions and includes overdue open balances', async () => {
    const { container } = render(<FinanceDashboard />);

    const today = new Date();
    const month = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
    expect(await screen.findByText('A Receber (Previsão)')).not.toBeNull();
    expect(mocks.getReportTransactions).toHaveBeenCalledWith(`${month}-01`, expect.any(String));
    expect(mocks.getReportPayables.mock.calls.map(([status]) => status)).toEqual([
      'pending',
      'overdue',
    ]);
    expect(mocks.getReportReceivables.mock.calls.map(([status]) => status)).toEqual([
      'pending',
      'overdue',
    ]);

    const renderedText = (container.textContent || '').replace(/\u00a0/g, ' ');
    expect(renderedText).toContain('R$ 15,00');
    expect(renderedText).toContain('R$ 27,00');
    expect(renderedText).toContain('2 títulos em aberto');
    expect(renderedText).toContain('2 compromissos em aberto');
  });

  it('shows a retryable error instead of displaying zero balances after a query failure', async () => {
    mocks.getReportTransactions.mockRejectedValueOnce(new Error('falha simulada'));
    render(<FinanceDashboard />);

    expect((await screen.findByRole('alert')).textContent).toContain(
      'Não foi possível carregar os dados financeiros.'
    );
    expect(screen.queryByText('A Receber (Previsão)')).toBeNull();

    mocks.getReportTransactions.mockResolvedValueOnce([]);
    fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    expect(await screen.findByText('A Receber (Previsão)')).not.toBeNull();
  });
});
