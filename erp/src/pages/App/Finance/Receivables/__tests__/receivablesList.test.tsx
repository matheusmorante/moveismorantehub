// @vitest-environment happy-dom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ getReceivables: vi.fn() }));

vi.mock('@/pages/services/financeService', () => ({
  financeService: { getReceivables: mocks.getReceivables },
}));
vi.mock('../ReceivableModal', () => ({ default: () => null }));

import Receivables from '../index';

const account = (id: string, description: string, status = 'pending') => ({
  id,
  description,
  status,
  due_date: '2026-10-12',
  amount: 100,
  customer_name: 'Cliente de teste',
});

describe('Receivables list', () => {
  afterEach(cleanup);
  beforeEach(() => mocks.getReceivables.mockReset());

  it('shows a retryable error instead of reporting an empty list after a load failure', async () => {
    mocks.getReceivables.mockRejectedValueOnce(new Error('falha de conexão'));
    const { container } = render(<Receivables />);

    expect((await screen.findByRole('alert')).textContent).toContain(
      'Não foi possível carregar as contas a receber.'
    );
    expect(container.textContent).not.toContain('Nenhuma conta a receber encontrada.');

    mocks.getReceivables.mockResolvedValueOnce([]);
    fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));

    expect(await screen.findByText('Nenhuma conta a receber encontrada.')).not.toBeNull();
    expect(mocks.getReceivables).toHaveBeenCalledTimes(2);
  });

  it('ignores an older response when status filters change quickly', async () => {
    let resolveInitial!: (rows: ReturnType<typeof account>[]) => void;
    let resolvePending!: (rows: ReturnType<typeof account>[]) => void;
    let resolveOverdue!: (rows: ReturnType<typeof account>[]) => void;
    mocks.getReceivables
      .mockImplementationOnce(() => new Promise((resolve) => { resolveInitial = resolve; }))
      .mockImplementationOnce(() => new Promise((resolve) => { resolvePending = resolve; }))
      .mockImplementationOnce(() => new Promise((resolve) => { resolveOverdue = resolve; }));

    render(<Receivables />);
    await waitFor(() => expect(mocks.getReceivables).toHaveBeenCalledTimes(1));
    fireEvent.click(screen.getByRole('button', { name: 'Pendentes' }));
    fireEvent.click(screen.getByRole('button', { name: 'Atrasadas' }));
    await waitFor(() => expect(mocks.getReceivables).toHaveBeenCalledTimes(3));

    await act(async () => resolveOverdue([account('overdue-new', 'Resultado atual', 'overdue')]));
    expect(await screen.findByText('Resultado atual')).not.toBeNull();
    await act(async () => resolvePending([account('pending-old', 'Resultado antigo')]));
    await act(async () => resolveInitial([account('initial-old', 'Resultado inicial')]));

    expect(screen.getByText('Resultado atual')).not.toBeNull();
    expect(screen.queryByText('Resultado antigo')).toBeNull();
    expect(screen.queryByText('Resultado inicial')).toBeNull();
  });
});
