import type Order from '../types/order.type';
import { fetchOrderById, updateOrder } from './orderHistoryService';
import { ensureOrderItemsHaveFiscalSnapshots } from './orderFiscalSnapshotService';
import {
  hasFiscalItemSnapshot,
  hasPersistedAuthorizedInvoice,
} from '../../../../shared-utils/orderItemFiscalSnapshot';

/**
 * Completes and persists legacy item snapshots before the NF-e/NFC-e form opens.
 * The catalog is read only for legacy, unissued product lines; authorized invoice
 * data is handled by the snapshot service and never replaced with today's catalog.
 */
const inFlightPreparations = new Map<string, Promise<Order>>();

async function prepareOrderFiscalSnapshot(order: Order): Promise<Order> {
  const needsSnapshot = (items: Order['items']) =>
    items.some((item) => item.itemType !== 'service' && !hasFiscalItemSnapshot(item));

  if (!order.id) {
    throw new Error('Salve o pedido antes de iniciar a emissão da nota fiscal.');
  }
  if (!needsSnapshot(order.items || [])) return order;

  const persistedOrder = await fetchOrderById(order.id);
  if (!persistedOrder?.id) {
    throw new Error('Não foi possível recarregar o pedido para preparar os dados fiscais.');
  }

  if (!needsSnapshot(persistedOrder.items || [])) return persistedOrder;

  const items = await ensureOrderItemsHaveFiscalSnapshots(
    persistedOrder.items || [],
    persistedOrder.nfeData
  );
  const unresolvedItemNumbers = items.flatMap((item, index) =>
    item.itemType !== 'service' && !hasFiscalItemSnapshot(item) ? [index + 1] : []
  );

  if (unresolvedItemNumbers.length > 0) {
    const source = hasPersistedAuthorizedInvoice(persistedOrder)
      ? 'Não foi possível recuperar os dados destes itens do XML autorizado do próprio pedido'
      : 'Não foi possível localizar os dados fiscais atuais dos produtos destes itens';
    throw new Error(
      `${source}: ${unresolvedItemNumbers.join(', ')}. Confira os itens antes de emitir.`
    );
  }

  if (!persistedOrder.updatedAt) {
    throw new Error('Não foi possível confirmar a versão do pedido para salvar os dados fiscais.');
  }

  await updateOrder(
    persistedOrder.id,
    { items },
    persistedOrder,
    persistedOrder.updatedAt,
    { metadataOnly: true }
  );

  return { ...persistedOrder, items };
}

export function prepareOrderFiscalSnapshotForEmission(order: Order): Promise<Order> {
  const orderId = order.id;
  if (!orderId) return prepareOrderFiscalSnapshot(order);
  const existing = inFlightPreparations.get(orderId);
  if (existing) return existing;

  const preparation = prepareOrderFiscalSnapshot(order);
  inFlightPreparations.set(orderId, preparation);
  const clearPreparation = () => {
    if (inFlightPreparations.get(orderId) === preparation) {
      inFlightPreparations.delete(orderId);
    }
  };
  void preparation.then(clearPreparation, clearPreparation);
  return preparation;
}
