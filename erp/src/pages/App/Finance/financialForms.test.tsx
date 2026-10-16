// @vitest-environment happy-dom
import React from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Transactions from './Transactions';
import PayableModal from './Payables/PayableModal';
import type { AccountPayable } from '../../types/finance.type';

const mocks = vi.hoisted(() => ({
  createTransaction: vi.fn(), createPayable: vi.fn(), updatePayable: vi.fn(),
  bulkCreatePayables: vi.fn(), createRecurringPayableExpense: vi.fn(), settleAccount: vi.fn(), error: vi.fn(),
}));
vi.mock('@/pages/services/financeService', () => ({ financeService: {
  ...mocks,
  getTransactions: async () => [],
  getCategories: async () => [{ id: 'category-1', name: 'Expense category', type: 'expense' }],
} }));
vi.mock('@/components/CurrencyInput', () => ({ default: ({ value, onChangeValue }: {
  value: number; onChangeValue: (value: number) => void;
}) => <input aria-label="Amount" value={value} onChange={(event) => onChangeValue(Number(event.target.value))} /> }));
vi.mock('react-toastify', () => ({ toast: { error: mocks.error, success: vi.fn() } }));
afterEach(cleanup);
beforeEach(() => {
  vi.clearAllMocks();
  for (const mock of [mocks.createTransaction, mocks.createPayable, mocks.updatePayable, mocks.bulkCreatePayables, mocks.createRecurringPayableExpense, mocks.settleAccount]) {
    mock.mockResolvedValue({});
  }
});

async function fillPayable(view: ReturnType<typeof render>) {
  await screen.findByRole('option', { name: 'Expense category' });
  fireEvent.change(screen.getByPlaceholderText('Aluguel, Luz, Fornecedor X...'), { target: { value: ' Rent ' } });
  fireEvent.change(view.container.querySelector('input[name="amount"]')!, { target: { value: '120' } });
  fireEvent.change(view.container.querySelector('select[name="category_id"]')!, { target: { value: 'category-1' } });
}
function renderPayable(payable?: AccountPayable) {
  return render(<PayableModal payable={payable} onClose={vi.fn()} onSaved={vi.fn()} />);
}

describe('financial form resolver submits', () => {
  it('blocks invalid transaction and saves parsed values while allowing no category', async () => {
    render(<Transactions />);
    fireEvent.click(screen.getByRole('button', { name: 'Novo Lançamento' }));
    fireEvent.click(screen.getByRole('button', { name: 'Registrar' }));
    await waitFor(() => expect(mocks.error).toHaveBeenCalledWith('Informe a descrição.'));
    expect(mocks.createTransaction).not.toHaveBeenCalled();
    fireEvent.change(screen.getByPlaceholderText('Descrição'), { target: { value: ' Manual transaction ' } });
    fireEvent.change(screen.getByLabelText('Amount'), { target: { value: '12' } });
    fireEvent.click(screen.getByRole('button', { name: 'Registrar' }));
    await waitFor(() => expect(mocks.createTransaction).toHaveBeenCalledWith(expect.objectContaining({
      description: 'Manual transaction', amount: 12, category_id: '', type: 'expense',
    })));
  });
  it('shows uncertain transaction feedback inside the open modal and disables replay', async () => {
    mocks.createTransaction.mockRejectedValueOnce({ uncertain: true });
    render(<Transactions />);
    fireEvent.click(screen.getByRole('button', { name: 'Novo Lançamento' }));
    fireEvent.change(screen.getByPlaceholderText('Descrição'), { target: { value: 'Test' } });
    fireEvent.change(screen.getByLabelText('Amount'), { target: { value: '12' } });
    fireEvent.click(screen.getByRole('button', { name: 'Registrar' }));
    const dialog = within(screen.getByRole('dialog'));
    await waitFor(() => expect(dialog.getByRole('alert').textContent).toContain('Consulte a conta'));
    expect((dialog.getByRole('button', { name: 'Registrar' }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('blocks an invalid payable and saves the single parsed account', async () => {
    const view = renderPayable();
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    await waitFor(() => expect(mocks.error).toHaveBeenCalledWith('Informe a descrição.'));
    expect(mocks.createPayable).not.toHaveBeenCalled();
    await fillPayable(view);
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    await waitFor(() => expect(mocks.createPayable).toHaveBeenCalledWith(expect.objectContaining({ description: 'Rent', amount: 120, category_id: 'category-1', status: 'pending' })));
    expect(mocks.bulkCreatePayables).not.toHaveBeenCalled();
  });

  it('validates installment count before generating payable rows', async () => {
    const view = renderPayable();
    await fillPayable(view);
    fireEvent.click(screen.getByText('Parcelado'));
    const count = view.container.querySelector('input[min="2"]')!;
    fireEvent.change(count, { target: { value: '1' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    await waitFor(() => expect(mocks.error).toHaveBeenCalledWith('Informe de 2 a 120 parcelas inteiras.'));
    expect(mocks.bulkCreatePayables).not.toHaveBeenCalled();
    fireEvent.change(count, { target: { value: '2' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    await waitFor(() => expect(mocks.bulkCreatePayables).toHaveBeenCalledWith([
      expect.objectContaining({ description: 'Rent (Parc. 1/2)', amount: 60 }),
      expect.objectContaining({ description: 'Rent (Parc. 2/2)', amount: 60 }),
    ]));
  });

  it('keeps recurring creation and its 12 generated accounts behind validation', async () => {
    const view = renderPayable();
    await fillPayable(view);
    fireEvent.click(screen.getByText('Todo mês (recorrente)'));
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    await waitFor(() => expect(mocks.createRecurringPayableExpense).toHaveBeenCalledWith(expect.objectContaining({ payable: expect.objectContaining({ description: 'Rent', amount: 120 }), frequency: 'monthly', request_id: expect.any(String) })));
    expect(mocks.bulkCreatePayables).not.toHaveBeenCalled();
  });

  it('updates only the edited paid account, preserving its status', async () => {
    const view = renderPayable({ id: 'payable-1', description: 'Existing', amount: 10, due_date: '2026-10-14', category_id: 'category-1', status: 'paid' });
    await fillPayable(view);
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    await waitFor(() => expect(mocks.updatePayable).toHaveBeenCalledWith('payable-1', expect.objectContaining({ status: 'paid', description: 'Rent', amount: 120 })));
    expect(mocks.createPayable).not.toHaveBeenCalled();
    expect(mocks.bulkCreatePayables).not.toHaveBeenCalled();
  });

  it('blocks settlement of a non-finite persisted amount before either write', async () => {
    renderPayable({ id: 'payable-1', description: 'Existing', amount: Infinity, due_date: '2026-10-14', status: 'pending' });
    fireEvent.click(screen.getByRole('button', { name: 'Baixar Pagamento' }));
    await waitFor(() => expect(mocks.error).toHaveBeenCalled());
    expect(mocks.updatePayable).not.toHaveBeenCalled();
    expect(mocks.createTransaction).not.toHaveBeenCalled();
    expect(mocks.settleAccount).not.toHaveBeenCalled();
  });

  it('settles persisted values independently from unsaved edits', async () => {
    const view = renderPayable({ id: 'payable-1', description: 'Persisted account', amount: 10, due_date: '2026-10-14', status: 'pending' });
    fireEvent.change(view.container.querySelector('input[name="amount"]')!, { target: { value: '999' } });
    fireEvent.click(screen.getByRole('button', { name: 'Baixar Pagamento' }));
    await waitFor(() => expect(mocks.settleAccount).toHaveBeenCalledWith({ kind: 'payable', account: expect.objectContaining({ id: 'payable-1', description: 'Persisted account', amount: 10 }) }));
    expect(mocks.updatePayable).not.toHaveBeenCalled();
    expect(mocks.createTransaction).not.toHaveBeenCalled();
  });

  it('shares a lock between save and settlement and prevents closing a pending save', async () => {
    let finish!: () => void;
    mocks.updatePayable.mockImplementationOnce(() => new Promise<void>((resolve) => { finish = resolve; }));
    const onSaved = vi.fn(), onClose = vi.fn();
    const payable: AccountPayable = { id: 'payable-1', description: 'Saved', amount: 10, due_date: '2026-10-15', category_id: 'category-1', status: 'pending' };
    render(<PayableModal payable={payable} onSaved={onSaved} onClose={onClose} />);
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    fireEvent.click(screen.getByRole('button', { name: 'Baixar Pagamento' }));
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    await waitFor(() => expect(mocks.updatePayable).toHaveBeenCalledTimes(1));
    expect(mocks.settleAccount).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
    expect(onSaved).not.toHaveBeenCalled();
    expect(screen.getByRole('status').textContent).toContain('salvando');
    await act(async () => { finish(); });
    await waitFor(() => expect(onSaved).toHaveBeenCalledTimes(1));
  });

  it('does not complete the previous account after switching owners', async () => {
    let finish!: () => void;
    mocks.updatePayable.mockImplementationOnce(() => new Promise<void>((resolve) => { finish = resolve; }));
    const onSaved = vi.fn();
    const payable: AccountPayable = { id: 'payable-1', description: 'First', amount: 10, due_date: '2026-10-15', category_id: 'category-1', status: 'pending' };
    const view = render(<PayableModal payable={payable} onSaved={onSaved} onClose={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    await waitFor(() => expect(mocks.updatePayable).toHaveBeenCalledTimes(1));
    view.rerender(<PayableModal payable={{ ...payable, id: 'payable-2', description: 'Second' }} onSaved={onSaved} onClose={vi.fn()} />);
    await act(async () => { finish(); });
    expect(onSaved).not.toHaveBeenCalled();
    expect(screen.getByDisplayValue('Second')).toBeTruthy();
  });
  it('does not start a write if the owner unmounts during resolver validation', async () => {
    const payable: AccountPayable = { id: 'payable-1', description: 'First', amount: 10, due_date: '2026-10-15', category_id: 'category-1', status: 'pending' };
    const view = render(<PayableModal payable={payable} onSaved={vi.fn()} onClose={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    view.unmount();
    await act(async () => {});
    expect(mocks.updatePayable).not.toHaveBeenCalled();
  });
  it('does not display a stale validation toast after the owner unmounts', async () => {
    const view = renderPayable();
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    view.unmount();
    await act(async () => {});
    expect(mocks.error).not.toHaveBeenCalled();
    expect(mocks.createPayable).not.toHaveBeenCalled();
  });
});
