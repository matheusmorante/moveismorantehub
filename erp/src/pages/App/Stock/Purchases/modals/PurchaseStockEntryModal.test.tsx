// @vitest-environment happy-dom
import React from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import PurchaseStockEntryModal from './PurchaseStockEntryModal';
import type Purchase from '@/pages/types/purchase.type';
const mocks = vi.hoisted(() => ({ save: vi.fn(), update: vi.fn(), subscribe: vi.fn(), success: vi.fn() }));
vi.mock('@/pages/utils/inventoryService', () => ({ saveInventoryMove: mocks.save }));
vi.mock('@/pages/utils/purchaseService', () => ({ updatePurchase: mocks.update }));
vi.mock('@/pages/utils/productService', () => ({ subscribeToProducts: mocks.subscribe }));
vi.mock('react-toastify', () => ({ toast: { success: mocks.success } }));
const purchase = { id: 'purchase-1', purchaseNumber: 10, supplierName: 'Fornecedor', date: '2026-10-15', status: 'ordered', stockProcessed: false,
  items: [{ productId: 'product-1', variationId: 'variation-1', description: 'Produto', quantity: 2, unitCost: 0, totalCost: 0 }] } as Purchase;
beforeEach(() => {
  vi.clearAllMocks(); mocks.save.mockResolvedValue({ id: 'move-1' }); mocks.update.mockResolvedValue(undefined);
  mocks.subscribe.mockImplementation((callback) => { callback([{ id: 'product-1', stock: 5, variations: [{ id: 'variation-1', stock: 5 }] }]); return vi.fn(); });
});
afterEach(() => { cleanup(); vi.useRealTimers(); });
function setup(value = purchase) {
  const close = vi.fn(); const view = render(<PurchaseStockEntryModal isOpen purchase={value} onClose={close} />);
  const submit = () => fireEvent.click(screen.getByRole('button', { name: 'Confirmar movimentações de entrada' }));
  return { ...view, close, submit };
}
describe('purchase stock entry owner with real RHF/resolver', () => {
  it('validates all lines before any movement and keeps the failed form open', async () => {
    const view = setup({ ...purchase, items: [...purchase.items, { ...purchase.items[0], quantity: -1 }] }); view.submit();
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('quantidade maior que zero'));
    expect(mocks.save).not.toHaveBeenCalled(); expect(mocks.update).not.toHaveBeenCalled(); expect(view.close).not.toHaveBeenCalled();
  });
  it.each([
    [{ ...purchase, id: undefined }, 'não identificado'],
    [{ ...purchase, status: 'cancelled' }, 'cancelado'],
    [{ ...purchase, stockProcessed: true }, 'já foram registradas'],
    [{ ...purchase, items: [] }, 'Inclua os itens'],
    [{ ...purchase, date: '2026-02-30' }, 'data válida'],
  ] as const)('blocks invalid purchase context %#', async (value, message) => {
    const view = setup(value as Purchase); view.submit();
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain(message));
    expect(mocks.save).not.toHaveBeenCalled(); expect(mocks.update).not.toHaveBeenCalled();
  });
  it('uses parsed observation/date/lines and waits for purchase conclusion', async () => {
    let finish!: () => void; mocks.update.mockReturnValue(new Promise((resolve) => { finish = () => resolve(undefined); }));
    const view = setup();
    fireEvent.change(screen.getByLabelText('Data'), { target: { value: '2026-10-10' } });
    fireEvent.change(screen.getByLabelText('Observação'), { target: { value: '  Conferido  ' } }); view.submit();
    await waitFor(() => expect(mocks.update).toHaveBeenCalledWith('purchase-1', { stockProcessed: true }));
    expect(mocks.save).toHaveBeenCalledWith({ productId: 'product-1', variationId: 'variation-1', productDescription: 'Produto', type: 'entry', quantity: 2,
      date: new Date('2026-10-10T12:00:00').toISOString(), label: 'Entrada a partir do Pedido #10', observation: 'Conferido', unitCost: 0,
      relatedEntityId: 'purchase-1', relatedEntityType: 'purchase_order' }, 5);
    expect(view.close).not.toHaveBeenCalled(); expect(mocks.success).not.toHaveBeenCalled();
    await act(async () => { finish(); }); expect(view.close).toHaveBeenCalledOnce();
  });
  it('prevents writes before catalog loading or when any variation is missing', async () => {
    mocks.subscribe.mockImplementationOnce(() => vi.fn());
    const pending = setup(); pending.submit();
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('catálogo ainda não foi carregado'));
    pending.unmount();
    const missing = setup({ ...purchase, items: [...purchase.items, { ...purchase.items[0], variationId: 'missing' }] }); missing.submit();
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('variação não encontrado'));
    expect(mocks.save).not.toHaveBeenCalled();
  });
  it('locks before validation and prevents closing or double entry while saving', async () => {
    let finish!: () => void; mocks.save.mockReturnValue(new Promise((resolve) => { finish = () => resolve({ id: 'move-1' }); }));
    const view = setup(); const button = screen.getByRole('button', { name: 'Confirmar movimentações de entrada' });
    fireEvent.click(button); fireEvent.click(button); fireEvent.keyDown(window, { key: 'Escape' });
    screen.getAllByRole('button', { name: 'Fechar' }).forEach((button) => fireEvent.click(button));
    await waitFor(() => expect(mocks.save).toHaveBeenCalledOnce()); expect(view.close).not.toHaveBeenCalled();
    await act(async () => { finish(); }); expect(view.close).toHaveBeenCalledOnce();
  });
  it('reports partial completion and blocks replay without marking the purchase processed', async () => {
    mocks.save.mockResolvedValueOnce({ id: 'first' }).mockRejectedValueOnce({ code: '42501' });
    const view = setup({ ...purchase, items: [...purchase.items, purchase.items[0], purchase.items[0]] }); view.submit();
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('1 de 3 movimentos concluídos'));
    view.submit(); expect(mocks.save).toHaveBeenCalledTimes(2); expect(mocks.update).not.toHaveBeenCalled();
    expect(mocks.success).not.toHaveBeenCalled(); expect(view.close).not.toHaveBeenCalled();
  });
  it('does not repeat movements when conclusion fails after all were recorded', async () => {
    mocks.update.mockRejectedValueOnce({ code: '42501' }); const view = setup(); view.submit();
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('1 de 1 movimentos concluídos'));
    view.submit(); expect(mocks.save).toHaveBeenCalledOnce(); expect(mocks.update).toHaveBeenCalledOnce();
    expect(mocks.success).not.toHaveBeenCalled(); expect(view.close).not.toHaveBeenCalled();
  });
  it('stops on deadline or missing acknowledgment, releasing progress and blocking replay', async () => {
    mocks.save.mockResolvedValueOnce(undefined); const missing = setup(); missing.submit();
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('resultado da última operação não foi confirmado'));
    expect(mocks.update).not.toHaveBeenCalled(); missing.unmount();
    vi.useFakeTimers(); mocks.save.mockReturnValueOnce(new Promise(() => {}));
    const timeout = setup(); await act(async () => { timeout.submit(); });
    await act(async () => { await vi.advanceTimersByTimeAsync(30_000); });
    expect(screen.queryByRole('status')).toBeNull(); expect(screen.getByRole('alert').textContent).toContain('Consulte os movimentos');
    timeout.submit(); expect(mocks.save).toHaveBeenCalledTimes(2); expect(mocks.update).not.toHaveBeenCalled();
  });
  it('abandons the old batch on owner change and does not write if closed during validation', async () => {
    let finish!: () => void; mocks.save.mockReturnValueOnce(new Promise((resolve) => { finish = () => resolve({ id: 'move-1' }); }));
    const view = setup({ ...purchase, items: [purchase.items[0], purchase.items[0]] }); view.submit();
    await waitFor(() => expect(mocks.save).toHaveBeenCalledOnce());
    view.rerender(<PurchaseStockEntryModal isOpen purchase={{ ...purchase, id: 'purchase-2' }} onClose={view.close} />);
    await act(async () => { finish(); }); expect(mocks.save).toHaveBeenCalledOnce(); expect(mocks.update).not.toHaveBeenCalled();
    expect(view.close).not.toHaveBeenCalled(); view.unmount();
    const closed = setup(); closed.submit(); closed.unmount(); await act(async () => {});
    expect(mocks.save).toHaveBeenCalledOnce();
  });
});
