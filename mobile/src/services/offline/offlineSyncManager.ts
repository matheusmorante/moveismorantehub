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
  getPendingGoodsReceiptChecks,
  syncPendingGoodsReceipts,
} from '../stock/stockReceiptsService';
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

const SYNC_REQUEST_TIMEOUT_MS = 15000;

const withSyncTimeout = <T>(promise: Promise<T>, ms = SYNC_REQUEST_TIMEOUT_MS): Promise<T> =>
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
  private currentUserId: string | null = null;

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
        const { data } = await auth.getSession();
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
        listInventorySubmissions().catch(() => []),
        getPendingLocalCalendarEvents().catch(() => []),
        getPendingGoodsReceiptChecks().catch(() => []),
      ]);
      const userInv = invOutbox.filter((s) => {
        const owner = s.userId || (s.observation?.responsibleId as string | undefined);
        return !owner || !activeUserId || owner === activeUserId;
      });
      const userCal = calPending.filter(
        (e) => !e.created_by || !activeUserId || e.created_by === activeUserId
      );
      const userRec = recPending.filter(
        (r) => !r.userId || !activeUserId || r.userId === activeUserId
      );
      extraPending = userInv.length + userCal.length + userRec.length;
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
    const actorUserId =
      (typeof (payload as any)?.userId === 'string' && (payload as any).userId) ||
      (await this.resolveActiveUserId()) ||
      undefined;

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
      userId: actorUserId,
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
      const activeUserId = await this.resolveActiveUserId();
      for (const item of await SyncQueueRepository.listActive()) {
        if (!connectivityService.connected) break;
        // Segurança multi-usuário: impede sincronizar operação de outro usuário logado no mesmo aparelho
        if (item.userId && activeUserId && item.userId !== activeUserId) {
          continue;
        }
        await SyncQueueRepository.updateStatus(item.id, 'syncing');
        await this.emitSummary();
        try {
          const result = await withSyncTimeout(this.send(item));
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
          syncPendingInventorySubmissions(activeUserId).catch(() => 0),
          syncPendingLocalCalendarEvents(activeUserId).catch(() => 0),
          syncPendingGoodsReceipts(activeUserId).catch(() => 0),
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

    const serverVersion = Number(
      (currentOrder as any).version ?? currentData.syncVersion ?? item.expectedVersion
    );
    if (serverVersion > item.expectedVersion) {
      return {
        success: false,
        reason: 'VERSION_CONFLICT',
        server_version: serverVersion,
        server_state: currentOrder as Record<string, unknown>,
      };
    }

    const currentStatus = String(currentOrder.status || '').toLowerCase();
    if (['cancelled', 'cancelado'].includes(currentStatus)) {
      return {
        success: false,
        reason: 'ORDER_CANCELLED',
        server_version: serverVersion,
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
        server_version: serverVersion,
        server_state: currentOrder as Record<string, unknown>,
      };
    }

    const patch =
      (item.payload as any)?.order_data_patch &&
      typeof (item.payload as any).order_data_patch === 'object'
        ? ((item.payload as any).order_data_patch as Record<string, unknown>)
        : {};

    const nextVersion = serverVersion + 1;
    const mergedOrderData: Record<string, unknown> = {
      ...currentData,
      ...patch,
      syncVersion: nextVersion,
    };
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
      version: nextVersion,
      status: nextStatus,
      order_data: mergedOrderData,
    } as Record<string, unknown>;

    return {
      success: true,
      server_version: nextVersion,
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
