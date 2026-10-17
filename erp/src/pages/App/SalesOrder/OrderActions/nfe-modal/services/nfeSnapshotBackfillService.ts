import type Order from '@/pages/types/order.type';
import { updateOrder } from '@/pages/utils/orderHistoryService';
import {
  hasFiscalItemSnapshot,
  hasPersistedAuthorizedInvoice,
  ORDER_ITEM_FISCAL_SNAPSHOT_VERSION,
} from '../../../../../../../../shared-utils/orderItemFiscalSnapshot';
import type { NfeItemWithFiscal } from '../NfeItemsSection';

export async function backfillLegacyOrderItemSnapshots(params: {
  order: Order;
  nfeItems: NfeItemWithFiscal[];
  previewOnly: boolean;
  isRetry: boolean;
  persistedOrderIds: Set<string>;
}): Promise<void> {
  const { order, nfeItems, previewOnly, isRetry, persistedOrderIds } = params;

  if (
    !order.id ||
    previewOnly ||
    isRetry ||
    persistedOrderIds.has(String(order.id))
  ) {
    return;
  }

  const orderId = String(order.id);
  const updatedAt = (order as Order & { updatedAt?: string }).updatedAt;

  if (hasPersistedAuthorizedInvoice(order)) {
    await updateOrder(
      order.id,
      { items: order.items || [] },
      order,
      updatedAt
    );
    persistedOrderIds.add(orderId);
    return;
  }

  let productIndex = 0;
  let changed = false;
  const backfilledItems = (order.items || []).map((item) => {
    if (item.itemType === 'service') return item;
    const emissionItem = nfeItems[productIndex++];
    if (!emissionItem || hasFiscalItemSnapshot(item)) return item;
    changed = true;
    return {
      ...item,
      fiscal: { ...emissionItem.fiscal },
      fiscalSnapshotVersion: ORDER_ITEM_FISCAL_SNAPSHOT_VERSION,
      ...(item.productId ? { fiscalSnapshotProductId: item.productId } : {}),
      ...(item.variationId ? { fiscalSnapshotVariationId: item.variationId } : {}),
    };
  });

  if (changed) {
    await updateOrder(order.id, { items: backfilledItems }, order, updatedAt);
  }
  persistedOrderIds.add(orderId);
}
