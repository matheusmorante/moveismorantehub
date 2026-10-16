// @vitest-environment happy-dom
import React from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import PriceHistoryModal from './PriceHistoryModal';
import type Product from '@/pages/types/product.type';
const mocks = vi.hoisted(() => ({ prices: vi.fn(), batches: vi.fn(), update: vi.fn(), success: vi.fn() }));
vi.mock('../priceHistory', () => ({ loadPriceHistory: mocks.prices, loadBatchHistory: mocks.batches }));
vi.mock('@/pages/utils/inventoryService', () => ({ updateInventoryMove: mocks.update }));
vi.mock('react-toastify', () => ({ toast: { success: mocks.success } }));
const product: Product = { id: 'p1', description: 'Produto', unitPrice: 0, itemType: 'product', unit: 'UN', active: true };
const batch = { id: 'move-1', product_id: 'p1', type: 'entry', quantity: 2, unit_cost: 3, date: '2026-10-15T12:00:00Z', label: 'Entrada', observation: 'Origem', balance: 2 };
beforeEach(() => {
  vi.clearAllMocks(); mocks.prices.mockReset().mockResolvedValue([]); mocks.batches.mockReset().mockResolvedValue([{ ...batch }]);
  mocks.update.mockReset().mockResolvedValue({ id: 'move-1', quantity: 0, unitCost: 0 });
});
afterEach(() => { cleanup(); vi.useRealTimers(); });
function setup(value: Product | undefined = product) {
  const close = vi.fn(); const view = render(<PriceHistoryModal isOpen product={value} onClose={close} />);
  const openBatch = async () => {
    fireEvent.click(screen.getByRole('tab', { name: 'Entradas (Lotes/Custo)' }));
    await waitFor(() => expect(screen.getByTitle('Editar Lote')).toBeTruthy());
    fireEvent.click(screen.getByTitle('Editar Lote'));
  };
  const submit = () => fireEvent.click(screen.getByTitle('Confirmar'));
  return { ...view, close, openBatch, submit };
}
describe('price and batch history real RHF owners', () => {
  it('preserves the general query without a product and the unmounted closed dialog', async () => {
    const view = render(<PriceHistoryModal isOpen product={null} onClose={vi.fn()} />);
    await waitFor(() => expect(mocks.prices).toHaveBeenCalledWith(undefined));
    view.rerender(<PriceHistoryModal isOpen={false} product={null} onClose={vi.fn()} />);
    expect(screen.queryByRole('dialog')).toBeNull();
  });
  it('validates the product query and sends its parsed identity', async () => {
    const invalid = setup({ ...product, id: '' });
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('Produto não identificado'));
    expect(mocks.prices).not.toHaveBeenCalled(); invalid.unmount();
    setup({ ...product, id: ' p1 ' }); await waitFor(() => expect(mocks.prices).toHaveBeenCalledWith('p1'));
  });
  it('shows query failure instead of treating it as an empty history and permits an explicit reload', async () => {
    mocks.prices.mockRejectedValueOnce(new Error('Sem permissão'));
    setup(); await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('Não foi possível consultar'));
    expect(screen.queryByText('Nenhum registro encontrado')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Carregar novamente' }));
    await waitFor(() => expect(screen.getByText('Nenhum registro encontrado')).toBeTruthy());
  });
  it('blocks invalid quantity and displays resolver failure before UPDATE', async () => {
    const view = setup(); await view.openBatch();
    fireEvent.change(screen.getByLabelText('Editar quantidade'), { target: { value: '-1' } }); view.submit();
    await waitFor(() => expect(screen.getByRole('alert')).toBeTruthy()); expect(mocks.update).not.toHaveBeenCalled();
  });
  it('uses the real currency field, preserves zero and sends a parsed snapshot for concurrency checking', async () => {
    mocks.batches.mockResolvedValueOnce([{ ...batch, id: ' move-1 ', product_id: ' p1 ' }]);
    const view = setup(); await view.openBatch();
    fireEvent.change(screen.getByLabelText('Editar quantidade'), { target: { value: '0' } });
    fireEvent.change(screen.getByLabelText('Editar custo'), { target: { value: '0' } }); view.submit();
    await waitFor(() => expect(mocks.success).toHaveBeenCalledOnce());
    expect(mocks.update).toHaveBeenCalledWith('move-1', { quantity: 0, unitCost: 0 }, { productId: 'p1', quantity: 2, unitCost: 3 });
    expect(mocks.batches).toHaveBeenCalledTimes(2);
  });
  it('locks synchronously before validation and prevents duplicate, cancellation, tab or Escape during save', async () => {
    let finish!: () => void;
    mocks.update.mockReturnValueOnce(new Promise((resolve) => { finish = () => resolve({ id: 'move-1' }); }));
    const view = setup(); await view.openBatch(); const button = screen.getByTitle('Confirmar');
    fireEvent.click(button); fireEvent.click(button); fireEvent.click(screen.getByTitle('Cancelar'));
    fireEvent.click(screen.getByRole('tab', { name: 'Preços de Venda' }));
    fireEvent.click(screen.getByRole('button', { name: 'Fechar modal' })); fireEvent.keyDown(window, { key: 'Escape' });
    await waitFor(() => expect(mocks.update).toHaveBeenCalledOnce());
    expect(view.close).not.toHaveBeenCalled(); expect(screen.getByRole('status').textContent).toContain('atualizando');
    expect(screen.getByLabelText('Editar quantidade')).toBeTruthy();
    await act(async () => { finish(); }); await waitFor(() => expect(screen.queryByTitle('Confirmar')).toBeNull());
  });
  it('keeps a known failed change open and does not announce success', async () => {
    mocks.update.mockRejectedValueOnce(new Error('O lote foi alterado. Recarregue o histórico antes de salvar.'));
    const view = setup(); await view.openBatch(); view.submit();
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('lote foi alterado'));
    expect(screen.getByLabelText('Editar quantidade')).toBeTruthy(); expect(mocks.success).not.toHaveBeenCalled();
  });
  it.each([undefined, { uncertain: true, persistedMoveId: 'move-1' }])('blocks a missing/partial acknowledgment and retains its warning when cancelling the editor %#', async (failure) => {
    if (failure) mocks.update.mockRejectedValueOnce(failure); else mocks.update.mockResolvedValueOnce(undefined);
    const view = setup(); await view.openBatch(); view.submit();
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('não foi confirmad'));
    view.submit(); expect(mocks.update).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByTitle('Cancelar')); expect(screen.getByRole('alert')).toBeTruthy();
    fireEvent.click(screen.getByTitle('Editar Lote')); expect(screen.queryByTitle('Confirmar')).toBeNull();
    expect(mocks.success).not.toHaveBeenCalled();
  });
  it('keeps confirmed edits distinct from a reload failure and does not reopen the old write', async () => {
    mocks.batches.mockResolvedValueOnce([{ ...batch }]).mockRejectedValueOnce(new Error('Sem rede'));
    const view = setup(); await view.openBatch(); view.submit();
    await waitFor(() => expect(screen.getAllByRole('alert').some((alert) => alert.textContent?.includes('lote foi atualizado'))).toBe(true));
    expect(mocks.success).toHaveBeenCalledOnce(); expect(screen.queryByTitle('Confirmar')).toBeNull(); expect(mocks.update).toHaveBeenCalledOnce();
  });
  it('does not publish query/write results for another owner', async () => {
    let finish!: () => void;
    mocks.update.mockReturnValueOnce(new Promise((resolve) => { finish = () => resolve({ id: 'move-1' }); }));
    const view = setup(); await view.openBatch(); view.submit();
    await waitFor(() => expect(mocks.update).toHaveBeenCalledOnce());
    view.rerender(<PriceHistoryModal isOpen product={{ ...product, id: 'p2' }} onClose={view.close} />);
    await act(async () => { finish(); }); expect(mocks.success).not.toHaveBeenCalled(); expect(view.close).not.toHaveBeenCalled();
    expect(mocks.batches).toHaveBeenCalledOnce(); await waitFor(() => expect(mocks.prices).toHaveBeenCalledWith('p2'));
  });
  it('releases query progress at the deadline and ignores a late result', async () => {
    let finish!: () => void; mocks.prices.mockReturnValueOnce(new Promise((resolve) => { finish = () => resolve([]); }));
    vi.useFakeTimers(); setup(); await act(async () => {});
    await act(async () => { await vi.advanceTimersByTimeAsync(15_000); });
    expect(screen.getByRole('alert').textContent).toContain('Não foi possível consultar');
    expect(screen.queryByText('Carregando histórico...')).toBeNull(); await act(async () => { finish(); });
    expect(screen.getByRole('alert')).toBeTruthy();
  });
  it('releases save progress at the deadline, blocks replay and does not apply a late success', async () => {
    let finish!: () => void; mocks.update.mockReturnValueOnce(new Promise((resolve) => { finish = () => resolve({ id: 'move-1' }); }));
    const view = setup(); await view.openBatch(); vi.useFakeTimers(); await act(async () => { view.submit(); });
    await act(async () => { await vi.advanceTimersByTimeAsync(30_000); });
    expect(screen.queryByRole('status')).toBeNull(); expect(screen.getByRole('alert').textContent).toContain('não foi confirmada');
    view.submit(); await act(async () => { finish(); });
    expect(mocks.update).toHaveBeenCalledOnce(); expect(mocks.success).not.toHaveBeenCalled();
  });
  it('does not start a write after unmount during the resolver', async () => {
    const view = setup(); await view.openBatch(); view.submit(); view.unmount();
    await act(async () => {}); expect(mocks.update).not.toHaveBeenCalled();
  });
});
