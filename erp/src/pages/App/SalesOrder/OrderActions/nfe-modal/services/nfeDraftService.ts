import { updateOrder } from '@/pages/utils/orderHistoryService';
import type Order from '@/pages/types/order.type';
import type { FiscalAcquisitionPurpose } from '@/pages/types/order.type';
import type { NfeItemWithFiscal } from '../NfeItemsSection';

export function buildNfeDraftChanges(
  order: Order,
  recipientTaxId: string,
  nfeItems: NfeItemWithFiscal[],
  environment: 1 | 2 = 1,
  acquisitionPurpose?: FiscalAcquisitionPurpose | null
): Partial<Order> {
  // Emission-specific fields stay in this environment's draft, not in commercial order data.
  const changes: Partial<Order> = {
    nfeDraft: {
      ...order.nfeDraft,
      [environment === 1 ? '1' : '2']: {
        recipientTaxId: recipientTaxId.trim() || undefined,
        acquisitionPurpose: acquisitionPurpose || undefined,
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
  return changes;
}

export async function saveNfeDraftToDatabase(
  order: Order | null,
  recipientTaxId: string,
  nfeItems: NfeItemWithFiscal[],
  environment: 1 | 2 = 1,
  acquisitionPurpose?: FiscalAcquisitionPurpose | null
): Promise<void> {
  if (!order?.id) return;
  await updateOrder(String(order.id), buildNfeDraftChanges(order, recipientTaxId, nfeItems, environment, acquisitionPurpose), order, order.updatedAt);
}
