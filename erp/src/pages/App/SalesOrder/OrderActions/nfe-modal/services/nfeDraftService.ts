import { updateOrder } from '@/pages/utils/orderHistoryService';
import type Order from '@/pages/types/order.type';
import type Item from '@/pages/types/items.type';
import type { NfeItemWithFiscal } from '../NfeItemsSection';
import {
  hasFiscalItemSnapshot,
  hasPersistedAuthorizedInvoice,
  ORDER_ITEM_FISCAL_SNAPSHOT_VERSION,
} from '../../../../../../../../shared-utils/orderItemFiscalSnapshot';

export async function saveNfeDraftToDatabase(
  order: Order | null,
  recipientTaxId: string,
  nfeItems: NfeItemWithFiscal[],
  environment: 1 | 2 = 1
): Promise<void> {
  if (!order?.id) return;
  // Homologation-only recipient IDs stay in the modal and are never persisted.
  const itemsNeedBackfill = (order.items || []).some(
    (item) => item.itemType !== 'service' && !hasFiscalItemSnapshot(item)
  );
  let productIndex = 0;
  const updatedItems = !itemsNeedBackfill
    ? undefined
    : hasPersistedAuthorizedInvoice(order)
      ? order.items || []
      : (order.items || []).map((item): Item => {
        if (item.itemType === 'service') return item;
        const emissionItem = nfeItems[productIndex++];
        if (!emissionItem || hasFiscalItemSnapshot(item)) return item;
        return {
          ...item,
          fiscal: { ...emissionItem.fiscal },
          fiscalSnapshotVersion: ORDER_ITEM_FISCAL_SNAPSHOT_VERSION,
          ...(item.productId ? { fiscalSnapshotProductId: item.productId } : {}),
          ...(item.variationId ? { fiscalSnapshotVariationId: item.variationId } : {}),
        };
      });
  const updatedAt = (order as Order & { updatedAt?: string }).updatedAt;
  const changes: Partial<Order> = {
    ...(updatedItems ? { items: updatedItems } : {}),
    ...(environment === 1 && recipientTaxId.trim()
      ? {
          customerData: {
            ...order.customerData,
            cpfCnpj: recipientTaxId,
            document: recipientTaxId,
          },
        }
      : {}),
    nfeDraft: {
      ...order.nfeDraft,
      [environment === 1 ? '1' : '2']: {
        items: nfeItems.map((item) => ({
        ...(item.orderItemId ? { orderItemId: item.orderItemId } : {}),
        ...(item.fiscalSnapshotProductId || item.productId
          ? { productId: item.fiscalSnapshotProductId || item.productId }
          : {}),
        ...(item.fiscalSnapshotVariationId || item.variationId
          ? { variationId: item.fiscalSnapshotVariationId || item.variationId }
          : {}),
        fiscal: { ...item.fiscal },
        })),
      },
    },
  };
  await updateOrder(
    String(order.id),
    changes,
    order,
    updatedAt
  );
}
