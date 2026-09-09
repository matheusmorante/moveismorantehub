import { SyncQueueRepository } from '../../repositories/SyncQueueRepository';
import { OrderRepository } from '../../repositories/OrderRepository';
import { generateUUID } from '../../utils/uuid';
import { supabase } from '../supabaseClient';
import { connectivityService } from './connectivityService';
import { ConflictReasonCode, OfflineSyncSummary, SyncEvent, SyncEventType, SyncQueueItem } from './offlineTypes';

type SyncListener = (summary: OfflineSyncSummary) => void;
type RpcResult = { success: boolean; reason?: ConflictReasonCode; server_state?: Record<string, unknown>; server_version?: number };
const knownReasons: ConflictReasonCode[] = ['VERSION_CONFLICT', 'ORDER_ALREADY_COMPLETED', 'ORDER_CANCELLED', 'ENTITY_NOT_FOUND', 'PERMISSION_DENIED', 'BUSINESS_RULE_REJECTED', 'NETWORK_ERROR', 'UNSUPPORTED_OPERATION'];
const isReason = (value: unknown): value is ConflictReasonCode => typeof value === 'string' && knownReasons.includes(value as ConflictReasonCode);

const eventPatch = (event: SyncEvent): Record<string, unknown> => {
  const base = { ...(event.payload as Record<string, unknown>), lastSyncEventId: event.eventId };
  if (event.type === 'DELIVERY_START_ROUTE') return { ...base, deliveryStatus: 'in_progress', deliveryStartedAt: event.occurredAt };
  if (event.type === 'DELIVERY_ARRIVE_DESTINATION') return { ...base, deliveryStatus: 'in_service', deliveryArrivedAt: event.occurredAt };
  if (event.type === 'DELIVERY_FINISH') return { ...base, deliveryStatus: 'completed', deliveryFinishedAt: event.occurredAt, status: 'fulfilled' };
  if (event.type === 'DELIVERY_UNATTENDED') return { ...base, deliveryStatus: 'unattended', unattendedAt: event.occurredAt };
  return base;
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
    connectivityService.subscribe((online) => { if (online) void this.processQueue(); void this.emitSummary(); });
    if (connectivityService.connected) void this.processQueue();
  }

  subscribe(listener: SyncListener): () => void {
    this.listeners.add(listener); void this.emitSummary();
    return () => this.listeners.delete(listener);
  }

  async getSummary(): Promise<OfflineSyncSummary> {
    const counts = await SyncQueueRepository.getSummary();
    return { pendingCount: counts.pending + counts.failed, syncingCount: counts.syncing, rejectedCount: counts.rejected,
      conflictCount: counts.conflict, hasRejections: counts.rejected + counts.conflict > 0,
      isOnline: connectivityService.connected, lastSyncAt: this.lastSyncAt };
  }

  async recordEvent<T extends Record<string, unknown>>(type: SyncEventType, entityType: SyncEvent['entityType'], entityId: string, payload: T): Promise<SyncEvent<T>> {
    const now = new Date().toISOString();
    const event: SyncEvent<T> = { eventId: generateUUID(), type, entityType, entityId, payload, state: 'PENDING', occurredAt: now, createdAt: now, retryCount: 0 };
    const local = entityType === 'order' ? await OrderRepository.getById(entityId) : null;
    await SyncQueueRepository.insert({ id: event.eventId, entityType, entityId, operation: 'update',
      payload: { event_type: type, order_data_patch: eventPatch(event) }, expectedVersion: local?.version ?? 1,
      idempotencyKey: event.eventId, status: 'pending', retryCount: 0, createdAt: now, updatedAt: now });
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
        await SyncQueueRepository.updateStatus(item.id, 'syncing'); await this.emitSummary();
        try {
          const result = await this.send(item);
          if (result.success) {
            await this.applyServerState(item, result);
            await SyncQueueRepository.updateStatus(item.id, 'synced');
          } else {
            const reason = isReason(result.reason) ? result.reason : 'BUSINESS_RULE_REJECTED';
            await this.applyServerState(item, result);
            await SyncQueueRepository.updateStatus(item.id, reason === 'VERSION_CONFLICT' ? 'conflict' : 'rejected', { reason, error: reason });
          }
        } catch (error: unknown) {
          const message = error instanceof Error ? error.message : 'Falha transitória de rede.';
          await SyncQueueRepository.updateStatus(item.id, 'failed', { error: message, reason: 'NETWORK_ERROR', incrementRetry: true });
          break;
        }
      }
      this.lastSyncAt = new Date().toISOString();
    } finally { this.isProcessing = false; await this.emitSummary(); }
  }

  private async send(item: SyncQueueItem): Promise<RpcResult> {
    const { data, error } = await supabase.rpc('sync_entity_operation', { p_entity_type: item.entityType, p_entity_id: item.entityId,
      p_operation: item.operation, p_expected_version: item.expectedVersion, p_idempotency_key: item.idempotencyKey, p_payload: item.payload });
    if (error) throw error;
    if (!data || typeof data !== 'object') throw new Error('Resposta inválida de sincronização.');
    return data as RpcResult;
  }

  private async applyServerState(item: SyncQueueItem, result: RpcResult): Promise<void> {
    if (item.entityType !== 'order' || !result.server_state) return;
    const state = result.server_state;
    const status = typeof state.status === 'string' ? state.status : 'scheduled';
    const orderData = state.order_data && typeof state.order_data === 'object' ? state.order_data as Record<string, unknown> : {};
    await OrderRepository.saveLocal({ id: item.entityId, status, orderData, version: result.server_version ?? item.expectedVersion,
      updatedAt: new Date().toISOString(), syncedAt: new Date().toISOString(), isPendingLocal: false });
  }

  private async emitSummary(): Promise<void> { const summary = await this.getSummary(); this.listeners.forEach((listener) => listener(summary)); }
}

export const offlineSyncManager = new OfflineSyncManager();
