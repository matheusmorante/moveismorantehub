import type Order from '../types/order.type';
import { fetchOrderById } from './orderSearchQueries';
import { isOrderSummary } from '../../../../shared-utils/orderSummaryQuery';

const pending = new Map<string, Promise<Order>>();

/** Share only an active read; reopening an action must see the current order. */
export function loadCompleteOrder(order: Order): Promise<Order> {
  if (!isOrderSummary(order)) return Promise.resolve(order);
  if (!order.id) return Promise.reject(new Error('O pedido não possui identificação.'));
  const id = order.id;
  const active = pending.get(id);
  if (active) return active;
  const request = fetchOrderById(id).then((full) => {
    if (!full || isOrderSummary(full)) throw new Error('Não foi possível carregar o pedido completo. Tente novamente.');
    return full;
  }).finally(() => { if (pending.get(id) === request) pending.delete(id); });
  pending.set(id, request);
  return request;
}
