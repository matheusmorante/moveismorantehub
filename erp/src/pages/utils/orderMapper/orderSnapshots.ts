import Order from '../../types/order.type';

// Status changes use this raw JSON because normalized columns can rehydrate
// into values that differ from the fiscal snapshot stored in order_data.
const persistedOrderDataSnapshots = new WeakMap<Order, Record<string, unknown>>();

export const getPersistedOrderDataSnapshot = (order: Order): Record<string, unknown> | undefined =>
  persistedOrderDataSnapshots.get(order);

export const setPersistedOrderDataSnapshot = (
  order: Order,
  snapshot: Record<string, unknown>
): void => {
  if (order && typeof order === 'object') {
    persistedOrderDataSnapshots.set(order, snapshot);
  }
};
