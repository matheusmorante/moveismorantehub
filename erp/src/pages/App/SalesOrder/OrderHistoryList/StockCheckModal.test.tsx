// @vitest-environment happy-dom
import React from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import StockCheckModal from './StockCheckModal';
import type Order from '@/pages/types/order.type';
vi.mock('../../../utils/orderCode', () => ({ formatOrderCode: () => '1' }));
afterEach(() => { cleanup(); vi.useRealTimers(); });
const order = {
  id: 'order-1', orderIndex: 1,
  items: [{ description: 'Produto', quantity: 2, orderItemId: 'line-1', fiscalSnapshotVersion: 1 }],
  assistanceItems: [{ description: 'Assistência', quantity: 1 }],
} as Order;
function setup(value = order, update = vi.fn(), close = vi.fn()) {
  render(<StockCheckModal isOpen order={value} onClose={close} onStockCheckUpdate={update} />);
  return { update, close };
}
describe('Stock labeling resolver', () => {
  it('awaits the callback with a common lock and disables closing/edits', async () => {
    let done!: (value: boolean) => void;
    const update = vi.fn(() => new Promise<boolean>((resolve) => { done = resolve; })), close = vi.fn(); setup(order, update, close);
    fireEvent.click(screen.getAllByRole('checkbox')[0]); fireEvent.click(screen.getByText('Concluir Etiquetagem'));
    await waitFor(() => expect(update).toHaveBeenCalledOnce()); expect(screen.getByRole('status')).toBeTruthy();
    fireEvent.click(screen.getAllByRole('checkbox')[0]); fireEvent.click(screen.getByText('Marcar Tudo')); fireEvent.keyDown(window, { key: 'Escape' }); fireEvent.click(screen.getByText('Cancelar'));
    expect(screen.getAllByRole('checkbox')[0].getAttribute('aria-checked')).toBe('true'); expect(close).not.toHaveBeenCalled();
    await act(async () => { done(true); }); await waitFor(() => expect(close).toHaveBeenCalledOnce());
  });
  it('reinitializes checks for a new order and opening without moving checks between positions', async () => {
    const update = vi.fn(); const props = { isOpen: true, order, onStockCheckUpdate: update, onClose: vi.fn() };
    const view = render(<StockCheckModal {...props} />); fireEvent.click(screen.getAllByRole('checkbox')[0]);
    view.rerender(<StockCheckModal {...props} order={{ ...order, id: 'order-2' }} />);
    expect(screen.getAllByRole('checkbox')[0].getAttribute('aria-checked')).toBe('false');
    fireEvent.click(screen.getByText('Marcar Tudo')); view.rerender(<StockCheckModal {...props} isOpen={false} />); view.rerender(<StockCheckModal {...props} />);
    expect(screen.getAllByRole('checkbox')[0].getAttribute('aria-checked')).toBe('false');
  });
  it('old callback cannot close a new order', async () => {
    let done!: (value: boolean) => void; const update = vi.fn(() => new Promise<boolean>((resolve) => { done = resolve; })), close = vi.fn();
    const view = render(<StockCheckModal isOpen order={order} onClose={close} onStockCheckUpdate={update} />); fireEvent.click(screen.getByText('Concluir Etiquetagem'));
    await waitFor(() => expect(update).toHaveBeenCalledOnce()); view.rerender(<StockCheckModal isOpen order={{ ...order, id: 'other' }} onClose={close} onStockCheckUpdate={update} />);
    await act(async () => { done(true); }); expect(close).not.toHaveBeenCalled();
  });
  it.each(['false', 'timeout'] as const)('unconfirmed %s preserves selection and blocks replay', async (kind) => {
    const update = kind === 'false' ? vi.fn().mockResolvedValue(false) : vi.fn().mockReturnValue(new Promise(() => {}));
    if (kind === 'timeout') vi.useFakeTimers(); const { close } = setup(order, update); fireEvent.click(screen.getByText('Marcar Tudo')); fireEvent.click(screen.getByText('Concluir Etiquetagem'));
    if (kind === 'timeout') await act(async () => { await vi.advanceTimersByTimeAsync(30001); }); else await waitFor(() => expect(screen.getByRole('alert')).toBeTruthy());
    expect(screen.getByRole('alert').textContent).toContain('Confira o pedido'); expect(close).not.toHaveBeenCalled(); expect(screen.getAllByRole('checkbox')[0].getAttribute('aria-checked')).toBe('true');
    fireEvent.click(screen.getByText('Concluir Etiquetagem')); expect(update).toHaveBeenCalledOnce();
  });
  it('preserves item snapshots and partial labeling when submitting parsed checks', async () => {
    const { update, close } = setup();
    fireEvent.click(screen.getAllByRole('checkbox')[0]);
    fireEvent.click(screen.getByRole('button', { name: 'Concluir Etiquetagem' }));
    await waitFor(() => expect(update).toHaveBeenCalledWith('order-1', false,
      [{ ...order.items![0], isStockChecked: true }], [{ ...order.assistanceItems![0], isStockChecked: false }],
    ));
    expect(close).toHaveBeenCalledOnce();
    expect(order.items![0]).not.toHaveProperty('isStockChecked');
  });
  it('marks all product and assistance lines without changing their original data', async () => {
    const { update } = setup();
    fireEvent.click(screen.getByRole('button', { name: 'Marcar Tudo' }));
    fireEvent.click(screen.getByRole('button', { name: 'Concluir Etiquetagem' }));
    await waitFor(() => expect(update).toHaveBeenCalledWith('order-1', true,
      [{ ...order.items![0], isStockChecked: true }], [{ ...order.assistanceItems![0], isStockChecked: true }],
    ));
  });
  it('does not submit an unidentified order', async () => {
    const { update, close } = setup({ ...order, id: undefined });
    fireEvent.click(screen.getByRole('button', { name: 'Concluir Etiquetagem' }));
    await waitFor(() => expect(screen.getByRole('alert').textContent).toBe('Pedido não identificado.'));
    expect(update).not.toHaveBeenCalled();
    expect(close).not.toHaveBeenCalled();
  });
  it('does not declare an empty order fully labeled', async () => {
    const { update } = setup({ ...order, items: [], assistanceItems: [] });
    fireEvent.click(screen.getByRole('button', { name: 'Concluir Etiquetagem' }));
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('não contém itens'));
    expect(update).not.toHaveBeenCalled();
  });
  it('keeps the modal open and shows a failed update', async () => {
    const { close } = setup(order, vi.fn(async () => { throw new Error('Falha ao salvar etiquetagem.'); }));
    fireEvent.click(screen.getByRole('button', { name: 'Concluir Etiquetagem' }));
    await waitFor(() => expect(screen.getByRole('alert').textContent).toBe('Falha ao salvar etiquetagem.'));
    expect(close).not.toHaveBeenCalled();
  });
});
