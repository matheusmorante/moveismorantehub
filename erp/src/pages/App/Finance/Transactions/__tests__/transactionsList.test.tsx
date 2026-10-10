// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getTransactions: vi.fn(),
  getCategories: vi.fn(),
  createTransaction: vi.fn(),
}));

vi.mock('@/pages/services/financeService', () => ({
  financeService: {
    getTransactions: mocks.getTransactions,
    getCategories: mocks.getCategories,
    createTransaction: mocks.createTransaction,
  },
}));

import Transactions from '../index';

describe('Transactions list', () => {
  afterEach(cleanup);
  beforeEach(() => {
    mocks.getTransactions.mockReset();
    mocks.getCategories.mockReset().mockResolvedValue([]);
    mocks.createTransaction.mockReset();
  });

  it('shows a retryable error instead of reporting an empty transaction history', async () => {
    mocks.getTransactions
      .mockRejectedValueOnce(new Error('falha de conexão'))
      .mockResolvedValueOnce([]);
    render(<Transactions />);

    expect((await screen.findByRole('alert')).textContent).toContain(
      'Não foi possível carregar as movimentações.'
    );
    expect(screen.queryByText('Nenhuma movimentação no período.')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));

    expect(await screen.findByText('Nenhuma movimentação no período.')).not.toBeNull();
    expect(mocks.getTransactions).toHaveBeenCalledTimes(2);
  });
});
