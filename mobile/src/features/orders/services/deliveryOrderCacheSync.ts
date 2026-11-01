import { offlineStorageService } from '../../../services/offline/offlineStorageService';
import { OrderRepository } from '../../../repositories/OrderRepository';

export const syncLocalOrderCaches = async (
  orderId: string,
  updatedData: Record<string, any>,
  nextStatus?: string
) => {
  const now = new Date().toISOString();
  try {
    const existing = await OrderRepository.getById(orderId);
    const status = nextStatus || updatedData.status || existing?.status || 'scheduled';
    await OrderRepository.saveLocal({
      id: orderId,
      status,
      orderType: existing?.orderType,
      customerName:
        existing?.customerName ||
        updatedData?.customerData?.fullName ||
        updatedData?.customerName,
      totalAmount:
        existing?.totalAmount ??
        Number(updatedData?.paymentsSummary?.totalOrderValue ?? updatedData?.totalValue ?? 0),
      orderData: updatedData,
      version: existing?.version ?? 1,
      updatedAt: now,
      syncedAt: existing?.syncedAt,
      isPendingLocal: true,
    });
  } catch {}

  for (const cacheKey of ['logistics_orders', 'assemblies_orders']) {
    try {
      const cached = await offlineStorageService.getWorkingSet<any[]>(cacheKey);
      if (Array.isArray(cached?.data) && cached.data.length > 0) {
        let changed = false;
        const nextList = cached.data.map((ord) => {
          if (ord?.id === orderId) {
            changed = true;
            const status = nextStatus || updatedData.status || ord.status || 'scheduled';
            return {
              ...ord,
              status,
              delivery_status: updatedData.deliveryStatus ?? null,
              deliveryStatus: updatedData.deliveryStatus,
              order_data: updatedData,
              updated_at: now,
            };
          }
          return ord;
        });
        if (changed) {
          await offlineStorageService.cacheWorkingSet(cacheKey, nextList);
        }
      }
    } catch {}
  }
};
