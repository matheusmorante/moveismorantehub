import { SyncQueueRepository } from '../../repositories/SyncQueueRepository';
import { OrderRepository } from '../../repositories/OrderRepository';
import { generateUUID } from '../../utils/uuid';
import { supabase } from '../supabaseClient';
import { connectivityService } from './connectivityService';
import { offlineStorageService } from './offlineStorageService';
import { listInventorySubmissions } from '../sqlite/inventoryOutbox';
import { syncPendingInventorySubmissions } from '../../features/stock/inventory/services/inventoryFinalizer';
import {
  getPendingLocalCalendarEvents,
  syncPendingLocalCalendarEvents,
} from '../scheduleEventsService';
import {
  ConflictReasonCode,
  OfflineSyncSummary,
  SyncEvent,
  SyncEventType,
  SyncQueueItem,
} from './offlineTypes';

type SyncListener = (summary: OfflineSyncSummary) => void;
type RpcResult = {
  success: boolean;
  reason?: ConflictReasonCode;
  server_state?: Record<string, unknown>;
  server_version?: number;
};
const knownReasons: ConflictReasonCode[] = [
  'VERSION_CONFLICT',
  'ORDER_ALREADY_COMPLETED',
  'ORDER_CANCELLED',
  'ENTITY_NOT_FOUND',
  'PERMISSION_DENIED',
  'BUSINESS_RULE_REJECTED',
  'NETWORK_ERROR',
  'UNSUPPORTED_OPERATION',
];
const isReason = (value: unknown): value is ConflictReasonCode =>
  typeof value === 'string' && knownReasons.includes(value as ConflictReasonCode);

const eventPatch = (event: SyncEvent): Record<string, unknown> => {
  const base = { ...(event.payload as Record<string, unknown>), lastSyncEventId: event.eventId };
  if (event.type === 'DELIVERY_START_ROUTE')
    return {
      ...base,
      deliveryStatus: 'in_progress',
      deliveryStartedAt: event.occurredAt,
      deliveryResponsibles:
        (event.payload as any)?.deliveryResponsibles ?? base.deliveryResponsibles,
      deliveryResponsibleName:
        (event.payload as any)?.deliveryResponsibleName ?? base.deliveryResponsibleName,
      deliveryResponsibleId:
        (event.payload as any)?.deliveryResponsibleId ?? base.deliveryResponsibleId,
    };
  if (event.type === 'DELIVERY_ARRIVE_DESTINATION')
    return { ...base, deliveryStatus: 'in_service', deliveryArrivedAt: event.occurredAt };
  if (event.type === 'DELIVERY_FINISH')
    return {
      ...base,
      deliveryStatus: 'completed',
      deliveryFinishedAt: event.occurredAt,
      status: 'fulfilled',
    };
  if (event.type === 'DELIVERY_UNATTENDED')
    return { ...base, deliveryStatus: 'unattended', unattendedAt: event.occurredAt };
  if (event.type === 'DELIVERY_STEP_BACK') {
    const payloadObj = (event.payload as Record<string, unknown>) || {};
    return {
      ...base,
      deliveryStatus: payloadObj.deliveryStatus ?? null,
      deliveryStartedAt: payloadObj.deliveryStartedAt ?? null,
      deliveryArrivedAt: payloadObj.deliveryArrivedAt ?? null,
    };
  }
  if (event.type === 'DELIVERY_CANCEL') {
    return {
      ...base,
      status: 'scheduled',
      deliveryStatus: null,
      deliveryStartedAt: null,
      deliveryArrivedAt: null,
      deliveryFinishedAt: null,
      unattendedAt: null,
      unattendedReason: null,
      unattendedNotes: null,
      unattendedProofUrl: null,
      unattendedProofUrls: null,
    };
  }
  return base;
};

const isMissingRpcError = (error: any): boolean => {
  if (!error) return false;
  const code = String(error.code || '');
  const message = String(error.message || '');
  return (
    code === 'PGRST202' ||
    code === '42883' ||
    /sync_entity_operation|could not find the function/i.test(message)
  );
};

class OfflineSyncManager {
  private isProcessing = false;
  private initialized = false;
  private listeners = new Set<SyncListener>();
  private lastSyncAt?: string;

  async initialize(): Promise<void> {
    if (this.initialized) return;
    this.initialized = true;
    await OrderRepository.init();
    await connectivityService.initialize();
    connectivityService.subscribe((online) => {
      if (online) void this.processQueue();
      void this.emitSummary();
    });
    if (connectivityService.connected) void this.processQueue();
  }

  subscribe(listener: SyncListener): () => void {
    this.listeners.add(listener);
    void this.emitSummary();
    return () => this.listeners.delete(listener);
  }

  async getSummary(): Promise<OfflineSyncSummary> {
    const counts = await SyncQueueRepository.getSummary();
    let extraPending = 0;
    try {
      const [invOutbox, calPending] = await Promise.all([
        listInventorySubmissions().catch(() => []),
        getPendingLocalCalendarEvents().catch(() => []),
      ]);
      extraPending = invOutbox.length + calPending.length;
    } catch {}

    return {
      pendingCount: counts.pending + counts.failed + extraPending,
      syncingCount: counts.syncing,
      rejectedCount: counts.rejected,
      conflictCount: counts.conflict,
      hasRejections: counts.rejected + counts.conflict > 0,
      isOnline: connectivityService.connected,
      lastSyncAt: this.lastSyncAt,
    };
  }

  async recordEvent<T extends Record<string, unknown>>(
    type: SyncEventType,
    entityType: SyncEvent['entityType'],
    entityId: string,
    payload: T
  ): Promise<SyncEvent<T>> {
    const now = new Date().toISOString();
    const event: SyncEvent<T> = {
      eventId: generateUUID(),
      type,
      entityType,
      entityId,
      payload,
      state: 'PENDING',
      occurredAt: now,
      createdAt: now,
      retryCount: 0,
    };
    const local = entityType === 'order' ? await OrderRepository.getById(entityId) : null;
    await SyncQueueRepository.insert({
      id: event.eventId,
      entityType,
      entityId,
      operation: type === 'CALENDAR_EVENT_CREATE' ? 'create' : 'update',
      payload: { event_type: type, order_data_patch: eventPatch(event) },
      expectedVersion: local?.version ?? 1,
      idempotencyKey: event.eventId,
      status: 'pending',
      retryCount: 0,
      createdAt: now,
      updatedAt: now,
    });
    await this.emitSummary();
    if (connectivityService.connected) void this.processQueue();
    return event;
  }

  async processQueue(): Promise<void> {
    if (this.isProcessing || !connectivityService.connected) return;
    this.isProcessing = true;
    try {
      for (const item of await SyncQueueRepository.listActive()) {
        if (!connectivityService.connected) break;
        await SyncQueueRepository.updateStatus(item.id, 'syncing');
        await this.emitSummary();
        try {
          const result = await this.send(item);
          if (result.success) {
            await this.applyServerState(item, result);
            await SyncQueueRepository.updateStatus(item.id, 'synced');
          } else {
            const reason = isReason(result.reason) ? result.reason : 'BUSINESS_RULE_REJECTED';
            await this.applyServerState(item, result);
            await SyncQueueRepository.updateStatus(
              item.id,
              reason === 'VERSION_CONFLICT' ? 'conflict' : 'rejected',
              { reason, error: reason }
            );
          }
        } catch (error: unknown) {
          const message = error instanceof Error ? error.message : 'Falha transitória de rede.';
          await SyncQueueRepository.updateStatus(item.id, 'failed', {
            error: message,
            reason: 'NETWORK_ERROR',
            incrementRetry: true,
          });
          break;
        }
      }

      if (connectivityService.connected) {
        await Promise.all([
          syncPendingInventorySubmissions().catch(() => 0),
          syncPendingLocalCalendarEvents().catch(() => 0),
        ]);
      }

      this.lastSyncAt = new Date().toISOString();
    } finally {
      this.isProcessing = false;
      await this.emitSummary();
    }
  }

  private async send(item: SyncQueueItem): Promise<RpcResult> {
    if (typeof supabase.rpc === 'function') {
      const { data, error } = await supabase.rpc('sync_entity_operation', {
        p_entity_type: item.entityType,
        p_entity_id: item.entityId,
        p_operation: item.operation,
        p_expected_version: item.expectedVersion,
        p_idempotency_key: item.idempotencyKey,
        p_payload: item.payload,
      });
      if (!error) {
        if (!data || typeof data !== 'object') {
          throw new Error('Resposta inválida de sincronização.');
        }
        return data as RpcResult;
      }
      if (!isMissingRpcError(error) || item.entityType !== 'order') {
        throw error;
      }
    }

    if (item.entityType === 'order') {
      return this.sendOrderDirectFallback(item);
    }

    return { success: false, reason: 'UNSUPPORTED_OPERATION' };
  }

  private async sendOrderDirectFallback(item: SyncQueueItem): Promise<RpcResult> {
    const { data: currentOrder, error: readError } = await supabase
      .from('orders')
      .select('id, status, order_data')
      .eq('id', item.entityId)
      .maybeSingle();
    if (readError) throw readError;
    if (!currentOrder) {
      return { success: false, reason: 'ENTITY_NOT_FOUND' };
    }

    const currentData =
      currentOrder.order_data && typeof currentOrder.order_data === 'object'
        ? (currentOrder.order_data as Record<string, unknown>)
        : {};

    if (currentData.lastSyncEventId === item.idempotencyKey) {
      return {
        success: true,
        server_version: item.expectedVersion,
        server_state: currentOrder as Record<string, unknown>,
      };
    }

    const currentStatus = String(currentOrder.status || '').toLowerCase();
    if (['cancelled', 'cancelado'].includes(currentStatus)) {
      return {
        success: false,
        reason: 'ORDER_CANCELLED',
        server_version: item.expectedVersion,
        server_state: currentOrder as Record<string, unknown>,
      };
    }

    const eventType = String((item.payload as any)?.event_type || '');
    if (
      ['fulfilled', 'atendido', 'completed'].includes(currentStatus) &&
      eventType !== 'DELIVERY_FINISH' &&
      eventType !== 'DELIVERY_STEP_BACK' &&
      eventType !== 'DELIVERY_CANCEL'
    ) {
      return {
        success: false,
        reason: 'ORDER_ALREADY_COMPLETED',
        server_version: item.expectedVersion,
        server_state: currentOrder as Record<string, unknown>,
      };
    }

    const patch =
      (item.payload as any)?.order_data_patch &&
      typeof (item.payload as any).order_data_patch === 'object'
        ? ((item.payload as any).order_data_patch as Record<string, unknown>)
        : {};

    const mergedOrderData: Record<string, unknown> = { ...currentData, ...patch };
    for (const [key, val] of Object.entries(patch)) {
      if (val === null) {
        delete mergedOrderData[key];
      }
    }

    const nextStatus =
      typeof patch.status === 'string' && patch.status.trim()
        ? patch.status
        : currentOrder.status;

    const { error: updateError } = await supabase
      .from('orders')
      .update({
        order_data: mergedOrderData,
        status: nextStatus,
      })
      .eq('id', item.entityId);
    if (updateError) throw updateError;

    const finalState = {
      ...currentOrder,
      status: nextStatus,
      order_data: mergedOrderData,
    } as Record<string, unknown>;

    return {
      success: true,
      server_version: item.expectedVersion + 1,
      server_state: finalState,
    };
  }

  private async applyServerState(item: SyncQueueItem, result: RpcResult): Promise<void> {
    if (item.entityType !== 'order' || !result.server_state) return;
    const state = result.server_state;
    const status = typeof state.status === 'string' ? state.status : 'scheduled';
    const orderData =
      state.order_data && typeof state.order_data === 'object'
        ? (state.order_data as Record<string, unknown>)
        : {};
    await OrderRepository.saveLocal({
      id: item.entityId,
      status,
      orderData,
      version: result.server_version ?? item.expectedVersion,
      updatedAt: new Date().toISOString(),
      syncedAt: new Date().toISOString(),
      isPendingLocal: false,
    });

    // Sincronizar também working sets em AsyncStorage para que Cronograma, Operações e Montagens reflitam o estado do servidor
    for (const cacheKey of ['logistics_orders', 'assemblies_orders']) {
      try {
        const cached = await offlineStorageService.getWorkingSet<any[]>(cacheKey);
        if (Array.isArray(cached?.data) && cached.data.length > 0) {
          let changed = false;
          const nextData = cached.data.map((ord) => {
            if (ord?.id === item.entityId) {
              changed = true;
              return {
                ...ord,
                status,
                delivery_status: (orderData.deliveryStatus as string | undefined) ?? null,
                deliveryStatus: orderData.deliveryStatus,
                order_data: orderData,
              };
            }
            return ord;
          });
          if (changed) {
            await offlineStorageService.cacheWorkingSet(cacheKey, nextData);
          }
        }
      } catch {}
    }
  }

  private async emitSummary(): Promise<void> {
    const summary = await this.getSummary();
    this.listeners.forEach((listener) => listener(summary));
  }
}

export const offlineSyncManager = new OfflineSyncManager();
