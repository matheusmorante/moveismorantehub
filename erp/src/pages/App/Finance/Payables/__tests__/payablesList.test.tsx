// @vitest-environment happy-dom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ getPayables: vi.fn() }));

vi.mock('@/pages/services/financeService', () => ({
  financeService: { getPayables: mocks.getPayables },
}));
vi.mock('../PayableModal', () => ({ default: () => null }));

import Payables from '../index';

const account = (id: string, description: string, status = 'pending') => ({
  id,
  description,
  status,
  due_date: '2026-10-12',
  amount: 100,
  supplier_name: 'Fornecedor de teste',
});

describe('Payables list', () => {
  afterEach(cleanup);
  beforeEach(() => mocks.getPayables.mockReset());

  it('shows a retryable error instead of reporting an empty list after a load failure', async () => {
    mocks.getPayables.mockRejectedValueOnce(new Error('falha de conexão'));
    const { container } = render(<Payables />);

    expect((await screen.findByRole('alert')).textContent).toContain(
      'Não foi possível carregar as contas a pagar.'
    );
    expect(container.textContent).not.toContain('Nenhuma conta a pagar encontrada.');

    mocks.getPayables.mockResolvedValueOnce([]);
    fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));

    expect(await screen.findByText('Nenhuma conta a pagar encontrada.')).not.toBeNull();
    expect(mocks.getPayables).toHaveBeenCalledTimes(2);
  });

  it('ignores an older response when status filters change quickly', async () => {
    let resolveInitial!: (rows: ReturnType<typeof account>[]) => void;
    let resolvePending!: (rows: ReturnType<typeof account>[]) => void;
    let resolveOverdue!: (rows: ReturnType<typeof account>[]) => void;
    mocks.getPayables
      .mockImplementationOnce(() => new Promise((resolve) => { resolveInitial = resolve; }))
      .mockImplementationOnce(() => new Promise((resolve) => { resolvePending = resolve; }))
      .mockImplementationOnce(() => new Promise((resolve) => { resolveOverdue = resolve; }));

    render(<Payables />);
    await waitFor(() => expect(mocks.getPayables).toHaveBeenCalledTimes(1));
    fireEvent.click(screen.getByRole('button', { name: 'Pendentes' }));
    fireEvent.click(screen.getByRole('button', { name: 'Atrasadas' }));
    await waitFor(() => expect(mocks.getPayables).toHaveBeenCalledTimes(3));

    await act(async () => resolveOverdue([account('overdue-new', 'Resultado atual', 'overdue')]));
    expect(await screen.findByText('Resultado atual')).not.toBeNull();
    await act(async () => resolvePending([account('pending-old', 'Resultado antigo')]));
    await act(async () => resolveInitial([account('initial-old', 'Resultado inicial')]));

    expect(screen.getByText('Resultado atual')).not.toBeNull();
    expect(screen.queryByText('Resultado antigo')).toBeNull();
    expect(screen.queryByText('Resultado inicial')).toBeNull();
  });
});
