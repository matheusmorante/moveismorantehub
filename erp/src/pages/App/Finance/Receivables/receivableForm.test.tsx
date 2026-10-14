// @vitest-environment happy-dom
import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ReceivableModal from './ReceivableModal';
import type { AccountReceivable } from '../../../types/finance.type';
const mocks = vi.hoisted(() => ({ create: vi.fn(), update: vi.fn(), transaction: vi.fn(), error: vi.fn() }));
vi.mock('@/pages/services/financeService', () => ({ financeService: {
  getCategories: async () => [], createReceivable: mocks.create, updateReceivable: mocks.update, createTransaction: mocks.transaction,
} }));
vi.mock('react-toastify', () => ({ toast: { error: mocks.error, success: vi.fn() } }));
afterEach(cleanup);
beforeEach(() => { vi.clearAllMocks(); mocks.create.mockResolvedValue({}); mocks.update.mockResolvedValue({}); mocks.transaction.mockResolvedValue({}); });
function renderReceivable(receivable?: AccountReceivable) {
  return render(<ReceivableModal receivable={receivable} onClose={vi.fn()} onSaved={vi.fn()} />);
}
describe('receivable resolver actions', () => {
  it('blocks invalid saving and allows valid input without category or customer', async () => {
    const view = renderReceivable();
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    await waitFor(() => expect(mocks.error).toHaveBeenCalledWith('Informe a descrição.'));
    expect(mocks.create).not.toHaveBeenCalled();
    fireEvent.change(screen.getByPlaceholderText('Referente à venda X, Serviço Y...'), { target: { value: ' Service ' } });
    fireEvent.change(view.container.querySelector('input[name="amount"]')!, { target: { value: '20' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    await waitFor(() => expect(mocks.create).toHaveBeenCalledWith(expect.objectContaining({ description: 'Service', amount: 20, category_id: '', customer_name: '' })));
  });
  it('blocks an invalid persisted settlement before either write', async () => {
    renderReceivable({ id: 'receivable-1', description: 'Service', amount: NaN, due_date: '2026-10-14', status: 'pending' });
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar Recebimento' }));
    await waitFor(() => expect(mocks.error).toHaveBeenCalled());
    expect(mocks.update).not.toHaveBeenCalled();
    expect(mocks.transaction).not.toHaveBeenCalled();
  });
  it('settles the persisted account independently from unsaved amount changes', async () => {
    const view = renderReceivable({ id: 'receivable-1', description: 'Service', amount: 20, due_date: '2026-10-14', status: 'pending' });
    fireEvent.change(view.container.querySelector('input[name="amount"]')!, { target: { value: '999' } });
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar Recebimento' }));
    await waitFor(() => expect(mocks.transaction).toHaveBeenCalledWith(expect.objectContaining({ amount: 20, description: 'Recebimento: Service', type: 'income', receivable_id: 'receivable-1' })));
    expect(mocks.update).toHaveBeenCalledWith('receivable-1', expect.objectContaining({ status: 'paid' }));
  });
});
