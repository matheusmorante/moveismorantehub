// @vitest-environment happy-dom
import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Payables from './Payables';
import Receivables from './Receivables';
import Transactions from './Transactions';
import { financeService } from '@/pages/services/financeService';

vi.mock('@/pages/services/financeService', () => ({
  financeService: { getPayables: vi.fn(), getReceivables: vi.fn(), getTransactions: vi.fn(), getCategories: vi.fn() },
}));
vi.mock('./Payables/PayableModal', () => ({ default: () => null }));
vi.mock('./Receivables/ReceivableModal', () => ({ default: () => null }));
vi.mock('./useFinancialOperation', () => ({ useFinancialOperation: () => ({ busy: false, blocked: false, isBusy: () => false }) }));

const records = Array.from({ length: 20 }, (_, index) => ({
  id: `id-${index + 1}`, description: `Item ${index + 1}`, status: 'pending',
  type: 'income', amount: 10, date: '2026-10-26', due_date: '2026-10-26', payment_method: 'Manual',
}));

beforeEach(() => {
  vi.mocked(financeService.getPayables).mockResolvedValue(records as any);
  vi.mocked(financeService.getReceivables).mockResolvedValue(records as any);
  vi.mocked(financeService.getTransactions).mockResolvedValue(records as any);
  vi.mocked(financeService.getCategories).mockResolvedValue([]);
});
afterEach(cleanup);

describe('Financial list pagination', () => {
  it.each([['contas a pagar', Payables], ['contas a receber', Receivables], ['movimentações', Transactions]])(
    'paginates %s and resets after a search', async (_name, Component) => {
      render(<Component />);
      expect(await screen.findByText('Item 1')).toBeTruthy();
      expect(screen.queryByText('Item 16')).toBeNull();
      fireEvent.click(screen.getByRole('button', { name: 'Página 2' }));
      expect(screen.getByText('Item 16')).toBeTruthy();
      fireEvent.change(screen.getByPlaceholderText(/Buscar/), { target: { value: 'Item 1' } });
      await waitFor(() => expect(screen.getByText('Item 1')).toBeTruthy());
      expect(screen.queryByText('Item 20')).toBeNull();
    }
  );

  it('keeps transaction totals based on the full filtered list', async () => {
    render(<Transactions />);
    await screen.findByText('Item 1');
    expect(screen.getAllByText(/200,00/)).toHaveLength(2);
    fireEvent.click(screen.getByRole('button', { name: 'Página 2' }));
    expect(screen.getAllByText(/200,00/)).toHaveLength(2);
  });
});
