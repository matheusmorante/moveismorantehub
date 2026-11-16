import { SyncQueueRepository } from '../../repositories/SyncQueueRepository';
import { OrderRepository } from '../../repositories/OrderRepository';
import { generateUUID } from '../../utils/uuid';
import { supabase } from '../supabaseClient';
import { connectivityService } from './connectivityService';
import { offlineStorageService } from './offlineStorageService';
import { listInventorySubmissions } from '../sqlite/inventoryOutbox';
import { syncPendingInventorySubmissions } from '../../features/stock/inventory/services/inventoryOutboxSync';
import {
  getPendingLocalCalendarEvents,
  syncPendingLocalCalendarEvents,
} from '../scheduleEventsService';
import {
  getPendingGoodsReceiptChecks,
  syncPendingGoodsReceipts,
} from '../stock/stockReceiptsService';
import { eventPatch } from './offlineEventPatch';
import { prepareDeliveryProofs } from './deliveryProofQueuePreparation';
import { sendOrderDirectFallback } from './offlineOrderDirectFallback';
import { withTimeout } from '../../../../shared-utils/withTimeout';
import { applyDeliveryOperationEvent, attachDeliveryOperationStates, type DeliveryOperationEvent } from '../../features/orders/services/deliveryOperationState';
import type { RpcResult } from './offlineOrderDirectFallback';
import {
  ConflictReasonCode,
  OfflineSyncSummary,
  SyncEvent,
  SyncEventType,
  SyncQueueItem,
} from './offlineTypes';

type SyncListener = (summary: OfflineSyncSummary) => void;

const SYNC_REQUEST_TIMEOUT_MS = 15000;

const withSyncTimeout = <T,>(promise: Promise<T>, ms = SYNC_REQUEST_TIMEOUT_MS): Promise<T> =>
  new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error('SYNC_NETWORK_TIMEOUT'));
    }, ms);
    promise.then(
      (val) => {
        clearTimeout(timer);
        resolve(val);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      }
    );
  });

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

const resolveServerVersion = (result: RpcResult, fallback: number): number => {
  const serverOrderData = result.server_state?.order_data;
  const version = Number(
    result.server_version ??
      result.server_state?.version ??
      (serverOrderData && typeof serverOrderData === 'object'
        ? (serverOrderData as Record<string, unknown>).syncVersion
        : undefined)
  );
  return Number.isFinite(version) ? version : fallback;
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
  private activeProcessPromise: Promise<void> | null = null;
  private pendingRerun = false;
  private initialized = false;
  private listeners = new Set<SyncListener>();
  private lastSyncAt?: string;
  private currentUserId: string | null = null;
  private deferredEvents = new Set<string>();

  releaseDeferredEvent(eventId: string): void {
    this.deferredEvents.delete(eventId);
  }

  setCurrentUserId(userId: string | null): void {
    const prev = this.currentUserId;
    this.currentUserId = userId ? String(userId) : null;
    if (prev !== this.currentUserId && this.currentUserId && connectivityService.connected) {
      void this.processQueue();
    }
    void this.emitSummary();
  }

  getCurrentUserId(): string | null {
    return this.currentUserId;
  }

  private async resolveActiveUserId(): Promise<string | null> {
    if (this.currentUserId) return this.currentUserId;
    try {
      const auth = (supabase as any)?.auth;
      if (typeof auth?.getSession === 'function') {
        const session = await withTimeout<{ data: { session: { user: { id: string } } | null } } | null>(
          auth.getSession(), 5_000, null, 'offline:conferir-sessao'
        );
        const data = session?.data;
        const sessionUserId = data?.session?.user?.id || null;
        if (sessionUserId) {
          this.currentUserId = String(sessionUserId);
          return this.currentUserId;
        }
      }
    } catch {}
    return null;
  }

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
    const activeUserId = await this.resolveActiveUserId();
    let extraPending = 0;
    try {
      const [invOutbox, calPending, recPending] = await Promise.all([
        activeUserId ? listInventorySubmissions(activeUserId).catch(() => []) : Promise.resolve([]),
        getPendingLocalCalendarEvents().catch(() => []),
        getPendingGoodsReceiptChecks().catch(() => []),
      ]);
      const userCal = calPending.filter(
        (e) => !e.created_by || !activeUserId || e.created_by === activeUserId
      );
      const userRec = recPending.filter(
        (r) => !r.userId || !activeUserId || r.userId === activeUserId
      );
      extraPending = invOutbox.length + userCal.length + userRec.length;
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
    payload: T,
    options: { deferProcessing?: boolean; requireActor?: boolean } = {}
  ): Promise<SyncEvent<T>> {
    const now = new Date().toISOString();
    const actorUserId =
      (typeof (payload as any)?.userId === 'string' && (payload as any).userId) ||
      (await this.resolveActiveUserId()) ||
      undefined;
    if (options.requireActor && !actorUserId) throw new Error('Entre na sua conta para registrar a operação.');

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
    if (options.deferProcessing) this.deferredEvents.add(event.eventId);
    try {
      await SyncQueueRepository.insert({
      id: event.eventId,
      entityType,
      entityId,
      operation: type === 'CALENDAR_EVENT_CREATE' ? 'create' : 'update',
      payload: { event_type: type, order_data_patch: eventPatch(event) },
      expectedVersion: local?.version ?? 1,
      idempotencyKey: event.eventId,
      userId: actorUserId,
      status: 'pending',
      retryCount: 0,
      createdAt: now,
      updatedAt: now,
      });
    } catch (error) {
      this.deferredEvents.delete(event.eventId);
      throw error;
    }
    // The event is already durable; a summary refresh must not strand it.
    await this.emitSummary().catch(() => {});
    if (connectivityService.connected && !options.deferProcessing) void this.processQueue();
    return event;
  }

  async processQueue(): Promise<void> {
    if (!connectivityService.connected) return;
    if (this.activeProcessPromise) {
      this.pendingRerun = true;
      await this.activeProcessPromise;
      return;
    }
    this.isProcessing = true;
    let hadNetworkError = false;
    const run = (async () => {
      try {
        const activeUserId = await this.resolveActiveUserId();
        const queuedItems = await SyncQueueRepository.listActive();
        for (let queueIndex = 0; queueIndex < queuedItems.length; queueIndex += 1) {
          const item = queuedItems[queueIndex];
          if (!connectivityService.connected) break;
          if (this.deferredEvents.has(item.id)) break;
          if ((item.payload.order_data_patch as any)?.operationId && (!item.userId || item.userId !== activeUserId)) continue;
          // Segurança multi-usuário: impede sincronizar operação de outro usuário logado no mesmo aparelho
          if (item.userId && activeUserId && item.userId !== activeUserId) {
            continue;
          }
          await SyncQueueRepository.updateStatus(item.id, 'syncing');
          await this.emitSummary();
          try {
            const preparedItem = await prepareDeliveryProofs(item);
            let result = await withSyncTimeout(this.send(preparedItem));
            if (!result.success && !result.server_state && (item.payload.order_data_patch as any)?.operationId) {
              const { data, error } = await withSyncTimeout(Promise.resolve(supabase.from('orders')
                .select('id,status,version,order_data,order_delivery_operations(appointment_id,revision,state),order_payments(payment_index,payment_method,amount,fee,fee_type,status,installments,paid_at)')
                .eq('id', item.entityId).maybeSingle()));
              if (error) throw error;
              if (data) result = { ...result, server_state: attachDeliveryOperationStates(data) };
            }
            if (result.success) {
              await this.applyServerState(item, result);
              const serverVersion = resolveServerVersion(result, item.expectedVersion);
              await this.rebasePendingOrderEvents(queuedItems, queueIndex, item, serverVersion);
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
            hadNetworkError = true;
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
            syncPendingInventorySubmissions(activeUserId).catch(() => 0),
            syncPendingLocalCalendarEvents(activeUserId).catch(() => 0),
            syncPendingGoodsReceipts(activeUserId).catch(() => 0),
          ]);
        }

        this.lastSyncAt = new Date().toISOString();
      } finally {
        this.isProcessing = false;
        this.activeProcessPromise = null;
        await this.emitSummary();
        if (this.pendingRerun && !hadNetworkError && connectivityService.connected) {
          this.pendingRerun = false;
          await this.processQueue();
        } else {
          this.pendingRerun = false;
        }
      }
    })();
    this.activeProcessPromise = run;
    await run;
  }

  private async send(item: SyncQueueItem): Promise<RpcResult> {
    const operationEvent = item.payload.order_data_patch as unknown as DeliveryOperationEvent | undefined;
    if (item.entityType === 'order' && operationEvent?.operationId) {
      const { data, error } = await (supabase as any).rpc('apply_order_delivery_operation_with_state', {
        p_order_id: item.entityId,
        p_operation_id: operationEvent.operationId,
        p_event_id: item.idempotencyKey,
        p_event_type: item.payload.event_type,
        p_expected_revision: operationEvent.expectedOperationRevision,
        p_patch: operationEvent.operationPatch,
        p_expected_payments: operationEvent.expectedPayments ?? null,
        p_payments: operationEvent.payments ?? null,
      });
      if (error) throw error;
      if (!data || typeof data !== 'object') throw new Error('Resposta inválida da operação de entrega.');
      return data as RpcResult;
    }
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
      return sendOrderDirectFallback(item);
    }

    return { success: false, reason: 'UNSUPPORTED_OPERATION' };
  }

  private async rebasePendingOrderEvents(
    queuedItems: SyncQueueItem[],
    currentIndex: number,
    item: SyncQueueItem,
    serverVersion: number
  ): Promise<void> {
    if (item.entityType !== 'order' || !item.userId) return;

    for (let index = currentIndex + 1; index < queuedItems.length; index += 1) {
      const later = queuedItems[index];
      if (
        later.entityType !== 'order' ||
        later.entityId !== item.entityId ||
        later.userId !== item.userId ||
        later.expectedVersion !== item.expectedVersion
      ) {
        continue;
      }

      await SyncQueueRepository.updateExpectedVersion(later.id, serverVersion);
      queuedItems[index] = { ...later, expectedVersion: serverVersion };
    }
  }

  private async applyServerState(item: SyncQueueItem, result: RpcResult): Promise<void> {
    if (item.entityType !== 'order' || !result.server_state) return;
    const state = result.server_state;
    const status = typeof state.status === 'string' ? state.status : 'scheduled';
    let orderData =
      state.order_data && typeof state.order_data === 'object'
        ? (state.order_data as Record<string, unknown>)
        : {};
    // Preserve later optimistic operations when the server confirms an earlier event.
    const currentOperation = (item.payload.order_data_patch as any)?.operationId;
    const pending = currentOperation ? await SyncQueueRepository.listActive() : [];
    const laterOperations = pending.filter((queued) =>
      queued.id !== item.id && queued.entityType === 'order' && queued.entityId === item.entityId &&
      (!queued.userId || queued.userId === item.userId) &&
      typeof (queued.payload.order_data_patch as any)?.operationId === 'string' &&
      (result.success || (queued.payload.order_data_patch as any)?.operationId !== currentOperation)
    );
    for (const queued of laterOperations) {
      orderData = applyDeliveryOperationEvent(orderData, queued.payload.order_data_patch as unknown as DeliveryOperationEvent);
    }
    await OrderRepository.saveLocal({
      id: item.entityId,
      status,
      orderData,
      version: resolveServerVersion(result, item.expectedVersion),
      updatedAt: new Date().toISOString(),
      syncedAt: new Date().toISOString(),
      isPendingLocal: laterOperations.length > 0,
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
