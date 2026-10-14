// @vitest-environment happy-dom
import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import StockCheckModal from './StockCheckModal';
import type Order from '@/pages/types/order.type';
vi.mock('../../../utils/orderCode', () => ({ formatOrderCode: () => '1' }));
afterEach(cleanup);
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
