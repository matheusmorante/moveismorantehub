// @vitest-environment happy-dom
import React from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import StockActionModal from './StockActionModal';
import type Order from '../../../types/order.type';
const mocks = vi.hoisted(() => ({ save: vi.fn(), success: vi.fn(), error: vi.fn() }));
vi.mock('@/pages/utils/inventoryService', () => ({ saveInventoryMove: mocks.save }));
vi.mock('react-toastify', () => ({ toast: { success: mocks.success, error: mocks.error } }));
vi.mock('@/pages/utils/orderCode', () => ({ formatOrderCode: () => '10' }));
const order = { id: 'order-1', orderType: 'sale', status: 'scheduled', items: [
  { productId: 'product-1', variationId: 'variation-1', description: 'Product', quantity: 2, unitPrice: 0, orderItemId: 'line-1', fiscalSnapshotVersion: 1 },
] } as Order;
beforeEach(() => { vi.clearAllMocks(); mocks.save.mockImplementation(async () => ({ id: 'move-1' })); });
afterEach(() => { cleanup(); vi.useRealTimers(); });
function setup(value = order, type: 'withdrawal' | 'entry' = 'withdrawal') {
  const close = vi.fn();
  const view = render(<StockActionModal isOpen order={value} type={type} onClose={close} />);
  const reason = () => fireEvent.change(screen.getByRole('textbox'), { target: { value: '  Conferência física  ' } });
  const submit = () => fireEvent.click(screen.getByRole('button', { name: type === 'withdrawal' ? 'Lançar Saída' : 'Confirmar Estorno' }));
  return { ...view, close, reason, submit };
}
describe('order inventory action with real RHF/resolver', () => {
  it('shows invalid reason and blocks all writes', async () => {
    const view = setup(); view.submit();
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('Informe o motivo'));
    expect(mocks.save).not.toHaveBeenCalled();
  });
  it('validates the whole catalog batch before writing any row', async () => {
    const view = setup({ ...order, items: [...order.items, { ...order.items[0], quantity: -1 }] });
    view.reason(); view.submit();
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('quantidade maior que zero'));
    expect(mocks.save).not.toHaveBeenCalled();
  });
  it('blocks an unidentified order and an empty eligible selection', async () => {
    const view = setup({ ...order, id: undefined }); view.reason(); view.submit();
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('Pedido não identificado'));
    view.unmount();
    const empty = setup({ ...order, items: [] }); empty.reason(); empty.submit();
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('Não há itens vinculados'));
    expect(mocks.save).not.toHaveBeenCalled();
  });
  it('sends the parsed reason and eligible items, preserving zero price and order snapshots', async () => {
    const view = setup({ ...order, items: [...order.items, { ...order.items[0], productId: 'service', itemType: 'service' }, { ...order.items[0], isTemporaryProduct: true }] });
    view.reason(); view.submit();
    await waitFor(() => expect(view.close).toHaveBeenCalledOnce());
    expect(mocks.save).toHaveBeenCalledTimes(1);
    expect(mocks.save).toHaveBeenCalledWith({ productId: 'product-1', variationId: 'variation-1', productDescription: 'Product', type: 'withdrawal', quantity: 2, unitPrice: 0, date: expect.any(String), label: 'Saída - Pedido #10', observation: 'Conferência física', relatedEntityId: 'order-1', relatedEntityType: 'sales_order' }, 0);
    expect(order.items[0]).toMatchObject({ orderItemId: 'line-1', fiscalSnapshotVersion: 1 });
  });
  it('preserves the distinct entry intent of a stock reversal', async () => {
    const view = setup(order, 'entry'); view.reason(); view.submit();
    await waitFor(() => expect(mocks.save).toHaveBeenCalledWith(expect.objectContaining({ type: 'entry', label: 'Estorno - Pedido #10' }), 0));
  });
  it('locks before validation and blocks Escape, cancel and duplicate confirmation', async () => {
    let finish!: () => void;
    mocks.save.mockReturnValue(new Promise((resolve) => { finish = () => resolve({ id: 'move-1' }); }));
    const view = setup(); view.reason(); view.submit(); view.submit();
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    fireEvent.keyDown(window, { key: 'Escape' });
    await waitFor(() => expect(mocks.save).toHaveBeenCalledOnce());
    expect(view.close).not.toHaveBeenCalled();
    expect(screen.getByRole('status').textContent).toContain('0 de 1');
    await act(async () => { finish(); });
    await waitFor(() => expect(view.close).toHaveBeenCalledOnce());
  });
  it('reports partial completion and blocks repetition after a later SQL failure', async () => {
    mocks.save.mockResolvedValueOnce({ id: 'first' }).mockRejectedValueOnce({ code: '42501' });
    const view = setup({ ...order, items: [...order.items, { ...order.items[0], productId: 'product-2' }, { ...order.items[0], productId: 'product-3' }] });
    view.reason(); view.submit();
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('1 de 3 movimentos concluídos'));
    expect(mocks.save).toHaveBeenCalledTimes(2);
    view.submit(); expect(mocks.save).toHaveBeenCalledTimes(2);
    expect(mocks.success).not.toHaveBeenCalled();
    expect(view.close).not.toHaveBeenCalled();
  });
  it('does not announce success or replay when an INSERT has no acknowledgment', async () => {
    mocks.save.mockResolvedValueOnce(undefined);
    const view = setup(); view.reason(); view.submit();
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('não foi confirmado'));
    view.submit(); expect(mocks.save).toHaveBeenCalledOnce();
    expect(mocks.success).not.toHaveBeenCalled();
  });
  it('distinguishes a persisted movement with pending balance', async () => {
    mocks.save.mockRejectedValueOnce({ uncertain: true, persistedMoveId: 'move-1' });
    const view = setup(); view.reason(); view.submit();
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('foi gravado com saldo pendente'));
    expect(view.close).not.toHaveBeenCalled();
  });
  it('does not continue an old batch or close another order after switching owners', async () => {
    let finish!: () => void;
    mocks.save.mockReturnValueOnce(new Promise((resolve) => { finish = () => resolve({ id: 'move-1' }); }));
    const view = setup({ ...order, items: [...order.items, { ...order.items[0], productId: 'product-2' }] }); view.reason(); view.submit();
    await waitFor(() => expect(mocks.save).toHaveBeenCalledOnce());
    view.rerender(<StockActionModal isOpen order={{ ...order, id: 'second' }} type="entry" onClose={view.close} />);
    await act(async () => { finish(); });
    expect(mocks.save).toHaveBeenCalledOnce();
    expect(view.close).not.toHaveBeenCalled();
    expect(screen.getByRole('textbox').textContent).toBe('');
  });
  it('stops the batch on deadline, releases progress and blocks replay', async () => {
    vi.useFakeTimers(); mocks.save.mockReturnValueOnce(new Promise(() => {}));
    const view = setup({ ...order, items: [...order.items, { ...order.items[0], productId: 'product-2' }] });
    view.reason(); await act(async () => { view.submit(); });
    await act(async () => { await vi.advanceTimersByTimeAsync(30_000); });
    expect(screen.queryByRole('status')).toBeNull();
    expect(screen.getByRole('alert').textContent).toContain('Consulte os movimentos');
    view.submit(); expect(mocks.save).toHaveBeenCalledOnce();
  });
  it('does not start a write if the modal closes during validation', async () => {
    const view = setup(); view.reason(); view.submit(); view.unmount();
    await act(async () => {});
    expect(mocks.save).not.toHaveBeenCalled();
  });
});
