// @vitest-environment happy-dom
import React from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import StockLaunchModal from './StockLaunchModal';
import type Product from '../../../types/product.type';
import { stockLaunchFormSchema } from '../../../../../../shared-utils/inventoryMoveSchemas';

const mocks = vi.hoisted(() => ({ save: vi.fn(), subscribe: vi.fn(), success: vi.fn(), error: vi.fn() }));
vi.mock('@/pages/utils/inventoryService', () => ({ saveInventoryMove: mocks.save, subscribeToInventoryMoves: mocks.subscribe }));
vi.mock('react-toastify', () => ({ toast: { success: mocks.success, error: mocks.error } }));
const product = { id: 'product-1', stock: 5, unit: 'UN', variations: [{ id: 'variation-1', name: 'Variação', stock: 5 }] } as Product;
beforeEach(() => {
  vi.clearAllMocks(); mocks.save.mockResolvedValue({ id: 'move-1' }); mocks.subscribe.mockImplementation(() => vi.fn());
});
afterEach(() => { cleanup(); vi.useRealTimers(); });
function setup(value = product) {
  const close = vi.fn();
  const view = render(<StockLaunchModal isOpen targetProduct={value} onClose={close} />);
  const reason = () => fireEvent.change(screen.getByLabelText('Motivo / Observação *'), { target: { value: '  Contagem física  ' } });
  const quantity = (value = '2') => fireEvent.change(screen.getByRole('spinbutton'), { target: { value } });
  const submit = () => fireEvent.click(screen.getByRole('button', { name: 'Confirmar Movimentação' }));
  return { ...view, close, reason, quantity, submit };
}

describe('manual inventory owner with real RHF/resolver', () => {
  it('shows invalid quantity and reason, and requires a registered variation', async () => {
    const view = setup(); view.reason(); view.submit();
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('quantidade maior que zero'));
    view.quantity(); fireEvent.change(screen.getByLabelText('Motivo / Observação *'), { target: { value: '   ' } }); view.submit();
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('Informe o motivo'));
    view.unmount();
    const missing = setup({ ...product, variations: [] }); missing.quantity(); missing.reason(); missing.submit();
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('Vincule uma variação'));
    expect(mocks.save).not.toHaveBeenCalled();
  });
  it.each([['Entrada', 'entry'], ['Saída', 'withdrawal']])('preserves %s and sends parsed values', async (label, type) => {
    const view = setup(); fireEvent.click(screen.getByRole('button', { name: label })); view.quantity(); view.reason(); view.submit();
    await waitFor(() => expect(view.close).toHaveBeenCalledOnce());
    expect(mocks.save).toHaveBeenCalledWith({ productId: 'product-1', variationId: 'variation-1', productDescription: 'Variação', type,
      quantity: 2, observation: 'Contagem física', label: 'Contagem física', date: expect.any(String) }, 5);
  });
  it('requires a changed explicit desired balance and permits adjustment to zero', async () => {
    const view = setup(); fireEvent.click(screen.getByRole('button', { name: 'Ajuste' })); view.reason(); view.submit();
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('novo saldo válido'));
    view.quantity('5'); view.submit();
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('igual ao saldo atual'));
    view.quantity('0'); view.submit();
    await waitFor(() => expect(view.close).toHaveBeenCalledOnce());
    expect(mocks.save).toHaveBeenCalledWith(expect.objectContaining({ type: 'balance', quantity: -5 }), 5);
  });
  it('locks during resolver/service work, preserves fields and blocks duplicate/close actions', async () => {
    let finish!: () => void;
    mocks.save.mockReturnValue(new Promise((resolve) => { finish = () => resolve({ id: 'move-1' }); }));
    const view = setup(); view.quantity(); view.reason();
    const button = screen.getByRole('button', { name: 'Confirmar Movimentação' });
    fireEvent.click(button); fireEvent.click(button);
    fireEvent.keyDown(window, { key: 'Escape' }); fireEvent.click(screen.getByRole('button', { name: 'Fechar modal' }));
    await waitFor(() => expect(mocks.save).toHaveBeenCalledOnce());
    expect(view.close).not.toHaveBeenCalled();
    expect((screen.getByLabelText('Motivo / Observação *') as HTMLInputElement).value).toBe('  Contagem física  ');
    expect(screen.getByRole('status').textContent).toContain('gravando');
    await act(async () => { finish(); });
    expect(view.close).toHaveBeenCalledOnce();
  });
  it('reports an unconfirmed balance and prevents retry of an already persisted movement', async () => {
    mocks.save.mockRejectedValueOnce({ uncertain: true, persistedMoveId: 'move-1' });
    const view = setup(); view.quantity(); view.reason(); view.submit();
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('foi gravado, mas o saldo'));
    view.submit(); expect(mocks.save).toHaveBeenCalledOnce();
    expect(view.close).not.toHaveBeenCalled(); expect(mocks.success).not.toHaveBeenCalled();
  });
  it('releases progress and blocks replay after a missing acknowledgment or deadline', async () => {
    mocks.save.mockResolvedValueOnce(undefined);
    const missing = setup(); missing.quantity(); missing.reason(); missing.submit();
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('Consulte os movimentos'));
    missing.submit(); expect(mocks.save).toHaveBeenCalledOnce(); missing.unmount();
    vi.useFakeTimers(); mocks.save.mockReturnValueOnce(new Promise(() => {}));
    const timeout = setup(); timeout.quantity(); timeout.reason(); await act(async () => { timeout.submit(); });
    await act(async () => { await vi.advanceTimersByTimeAsync(30_000); });
    expect(screen.queryByRole('status')).toBeNull();
    expect(screen.getByRole('alert').textContent).toContain('Consulte os movimentos');
    timeout.submit(); expect(mocks.save).toHaveBeenCalledTimes(2);
  });
  it('does not apply a balance based on a stock value changed during validation', async () => {
    const view = setup(); fireEvent.click(screen.getByRole('button', { name: 'Ajuste' })); view.quantity('10'); view.reason(); view.submit();
    view.rerender(<StockLaunchModal isOpen targetProduct={product} currentStock={7} onClose={view.close} />);
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('saldo mudou'));
    expect(mocks.save).not.toHaveBeenCalled();
  });
  it('does not close a new owner after an old write finishes or start writing after unmount', async () => {
    let finish!: () => void;
    mocks.save.mockReturnValueOnce(new Promise((resolve) => { finish = () => resolve({ id: 'move-1' }); }));
    const view = setup(); view.quantity(); view.reason(); view.submit();
    await waitFor(() => expect(mocks.save).toHaveBeenCalledOnce());
    view.rerender(<StockLaunchModal isOpen targetProduct={{ ...product, id: 'product-2' }} onClose={view.close} />);
    await act(async () => { finish(); });
    expect(view.close).not.toHaveBeenCalled(); expect(mocks.success).not.toHaveBeenCalled();
    view.unmount();
    const closed = setup(); closed.quantity(); closed.reason(); closed.submit(); closed.unmount();
    await act(async () => {}); expect(mocks.save).toHaveBeenCalledOnce();
  });
  it('rejects non-finite adjustment output and preserves a negative desired balance', () => {
    const values = { productId: 'p', variationId: 'v', productDescription: '', type: 'adjustment' as const, quantity: 0, currentStock: -1e308, newDesiredStock: '1e308', observation: 'Contagem' };
    expect(stockLaunchFormSchema.safeParse(values).success).toBe(false);
    expect(stockLaunchFormSchema.parse({ ...values, currentStock: 5, newDesiredStock: '-2' })).toMatchObject({ type: 'balance', quantity: -7 });
  });
});
