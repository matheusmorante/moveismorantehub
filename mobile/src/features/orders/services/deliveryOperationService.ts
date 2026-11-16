import { OrderRepository } from '../../../repositories/OrderRepository';
import { SyncQueueRepository } from '../../../repositories/SyncQueueRepository';
import { connectivityService } from '../../../services/offline/connectivityService';
import { offlineSyncManager } from '../../../services/offline/offlineSyncManager';
import type { SyncEventType } from '../../../services/offline/offlineTypes';
import { applyDeliveryOperationEvent, getIndependentOperationId, projectOperationOrder, type DeliveryOperationEvent } from './deliveryOperationState';
import { syncLocalOrderCaches } from './deliveryOrderCacheSync';
import { withTimeout } from '../../../../../shared-utils/withTimeout';

type OperationInput = {
  orderId: string;
  operationId: string;
  currentData: Record<string, any>;
  type: SyncEventType;
  patch: Record<string, unknown>;
  payments?: Array<Record<string, unknown>>;
  expectedPayments?: unknown;
};

/** Queue one operation-specific event; never fall back to an order-wide update. */
export async function saveDeliveryOperation(input: OperationInput) {
  const local = await OrderRepository.getById(input.orderId);
  const base = local?.isPendingLocal ? local.orderData as Record<string, any> : input.currentData;
  const operations = base.deliveryOperations && typeof base.deliveryOperations === 'object'
    ? base.deliveryOperations : {};
  const current = operations[input.operationId] || {};
  if (!Object.keys(operations).length &&
      (base.deliveryStartedAt || base.deliveryFinishedAt || base.deliveryArrivedAt ||
       ['in_progress', 'arrived', 'in_service', 'completed', 'unattended'].includes(base.deliveryStatus))) {
    throw new Error('O pedido possui um andamento anterior sem identificação da operação. Atualize os dados antes de continuar.');
  }
  const event: DeliveryOperationEvent = {
    operationId: input.operationId,
    expectedOperationRevision: Number(current.revision || 0),
    operationPatch: input.patch,
    ...(input.payments ? { payments: input.payments, expectedPayments: input.expectedPayments ?? null } : {}),
  };
  const queued = await offlineSyncManager.recordEvent(input.type, 'order', input.orderId, { ...event }, { deferProcessing: true, requireActor: true });
  const optimistic = applyDeliveryOperationEvent(base, event);
  try {
    await syncLocalOrderCaches(input.orderId, optimistic);
  } finally {
    offlineSyncManager.releaseDeferredEvent(queued.eventId);
  }
  let pendingSync = true;
  if (connectivityService.connected) {
    await withTimeout(offlineSyncManager.processQueue(), 10_000, undefined, 'entrega:sincronizar-operacao');
    const result = await SyncQueueRepository.getById(queued.eventId);
    if (result?.status === 'conflict') {
      throw new Error('A operação ou os pagamentos foram alterados em outro aparelho. Atualize o pedido e tente novamente.');
    }
    if (result?.status === 'rejected') throw new Error('Não foi possível salvar esta operação. Atualize o pedido e confira seus dados.');
    pendingSync = result?.status !== 'synced';
  }
  const refreshed = await OrderRepository.getById(input.orderId);
  const refreshedData = refreshed?.orderData as Record<string, any> | undefined;
  const refreshedRevision = Number(refreshedData?.deliveryOperations?.[input.operationId]?.revision ?? -1);
  return { updatedData: refreshedRevision >= event.expectedOperationRevision + 1 ? refreshedData! : optimistic, pendingSync };
}

export async function prepareIndependentDelivery(order: Record<string, any>) {
  const operationId = getIndependentOperationId(order);
  if (!operationId) return order;
  const source = order._sourceOrderData;
  const current = source.deliveryOperations?.[operationId];
  if (['completed', 'unattended'].includes(current?.deliveryStatus)) {
    throw new Error('Esta operação já foi encerrada. Atualize a lista para consultar seu estado.');
  }
  if (current?.deliveryPreparationStartedAt || current?.deliveryStatus) return order;
  const { updatedData } = await saveDeliveryOperation({
    orderId: order.id, operationId, currentData: source, type: 'DELIVERY_START_PREPARATION',
    patch: { deliveryPreparationStartedAt: new Date().toISOString() },
  });
  return projectOperationOrder(order, updatedData);
}
