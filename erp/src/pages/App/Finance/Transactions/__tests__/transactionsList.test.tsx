// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getTransactionPage: vi.fn(),
  getCategories: vi.fn(),
  createTransaction: vi.fn(),
}));

vi.mock('@/pages/services/financeService', () => ({
  financeService: {
    getTransactionPage: mocks.getTransactionPage,
    getCategories: mocks.getCategories,
    createTransaction: mocks.createTransaction,
  },
}));
vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({ isAdmin: true, profile: { full_name: 'Operador' }, user: { email: 'operador@example.com' } }),
}));

import Transactions from '../index';

describe('Transactions list', () => {
  afterEach(cleanup);
  beforeEach(() => {
    mocks.getTransactionPage.mockReset();
    mocks.getCategories.mockReset().mockResolvedValue([]);
    mocks.createTransaction.mockReset();
  });

  it('shows a retryable error instead of reporting an empty transaction history', async () => {
    mocks.getTransactionPage
      .mockRejectedValueOnce(new Error('falha de conexão'))
      .mockResolvedValueOnce({ rows: [], total_count: 0, income_total: 0, expense_total: 0 });
    render(<Transactions />);

    expect((await screen.findByRole('alert')).textContent).toContain(
      'Não foi possível carregar as movimentações.'
    );
    expect(screen.queryByText('Nenhuma movimentação no período.')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));

    expect(await screen.findByText('Nenhuma movimentação encontrada com esses filtros.')).not.toBeNull();
    expect(mocks.getTransactionPage).toHaveBeenCalledTimes(2);
  });
});
