// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import ReturnItemsSelection from './ReturnItemsSelection';
import type Order from '@/pages/types/order.type';

afterEach(cleanup);
const order = { items: [{ description: 'Mesa', productId: 'product', quantity: 3, unitPrice: 15 }] } as Order;
const mount = (quantity: number) => {
  const onQuantityChange = vi.fn();
  render(<ReturnItemsSelection order={order} quantities={{ 'line-0': quantity }} returnableQuantities={{ 'line-0': 3 }} onToggle={vi.fn()} onQuantityChange={onQuantityChange} />);
  return onQuantityChange;
};
describe('quantidades filhas da devolução', () => {
  it('preserva valores decimais na entrada em vez de truncar', () => {
    const change = mount(2);
    fireEvent.change(screen.getByRole('spinbutton'), { target: { value: '1.5' } });
    expect(change).toHaveBeenCalledWith('line-0', 1.5, 3);
  });
  it.each([0, Number.NaN])('mantém o campo selecionado quando a quantidade é inválida: %s', (quantity) => {
    const change = mount(quantity);
    const input = screen.getByRole('spinbutton');
    expect((input as HTMLInputElement).value).toBe(Number.isNaN(quantity) ? '' : '0');
    fireEvent.change(input, { target: { value: '-1' } });
    expect(change).toHaveBeenCalledWith('line-0', -1, 3);
  });
  it('encaminha o campo apagado como inválido em vez de assumir uma unidade', () => {
    const change = mount(2);
    fireEvent.change(screen.getByRole('spinbutton'), { target: { value: '' } });
    expect(change).toHaveBeenCalledWith('line-0', Number.NaN, 3);
  });
});
