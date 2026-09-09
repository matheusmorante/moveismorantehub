export type SyncQueueStatus =
  | 'pending'
  | 'syncing'
  | 'synced'
  | 'failed'
  | 'conflict'
  | 'rejected';

export type SyncOperationType = 'create' | 'update' | 'delete';

// Eventos de campo continuam sendo a linguagem das telas. Eles são convertidos
// em intenções versionadas antes de entrar na fila persistente.
export type SyncEventState = 'PENDING' | 'SYNCING' | 'CONFIRMED' | 'REJECTED';
export type SyncEventType =
  | 'DELIVERY_START_ROUTE'
  | 'DELIVERY_ARRIVE_DESTINATION'
  | 'DELIVERY_FINISH'
  | 'DELIVERY_UNATTENDED'
  | 'DELIVERY_STEP_BACK'
  | 'ASSEMBLY_STATUS_UPDATE'
  | 'ASSEMBLY_CHECKLIST_UPDATE'
  | 'INVENTORY_COUNT_ITEM'
  | 'GOODS_RECEIPT_CONFIRM';

export interface SyncEvent<T = unknown> {
  eventId: string;
  type: SyncEventType;
  entityType: 'order' | 'assembly' | 'inventory' | 'goods_receipt';
  entityId: string;
  state: SyncEventState;
  occurredAt: string;
  createdAt: string;
  syncedAt?: string;
  payload: T;
  rejectionReason?: string;
  retryCount: number;
}

export interface MediaUploadItem {
  id: string;
  eventId?: string;
  entityType: 'order_proof' | 'assembly_photo' | 'signature' | 'damage_photo';
  entityId: string;
  localUri: string;
  storageBucket: string;
  storagePath: string;
  remoteUrl?: string;
  state: SyncEventState;
  createdAt: string;
  retryCount: number;
  error?: string;
}

export type ConflictReasonCode =
  | 'VERSION_CONFLICT'
  | 'ORDER_ALREADY_COMPLETED'
  | 'ORDER_CANCELLED'
  | 'ENTITY_NOT_FOUND'
  | 'PERMISSION_DENIED'
  | 'BUSINESS_RULE_REJECTED'
  | 'NETWORK_ERROR'
  | 'UNSUPPORTED_OPERATION';

export interface SyncQueueItem<T = Record<string, unknown>> {
  id: string; // UUID v4 do item da fila
  entityType: 'order' | 'financial_transaction' | 'assembly' | 'inventory' | 'goods_receipt';
  entityId: string;
  operation: SyncOperationType;
  payload: T;
  expectedVersion: number;
  idempotencyKey: string; // UUID v4 para idempotência no servidor
  userId?: string;
  status: SyncQueueStatus;
  retryCount: number;
  lastError?: string;
  conflictReason?: ConflictReasonCode;
  createdAt: string;
  updatedAt: string;
}

export interface LocalOrder {
  id: string;
  status: string;
  orderType?: string;
  customerName?: string;
  totalAmount?: number;
  orderData: Record<string, unknown>;
  version: number;
  updatedAt: string;
  syncedAt?: string;
  isPendingLocal: boolean;
}

export interface LocalFinancialTransaction {
  id: string;
  type: 'ENTRADA' | 'SAIDA';
  amount: number;
  description?: string;
  category?: string;
  transactionData: Record<string, unknown>;
  version: number;
  updatedAt: string;
  isPendingLocal: boolean;
}

export interface DashboardSnapshot {
  id: string; // ex: 'current_dashboard'
  totalSales: number;
  totalOrders: number;
  pendingDeliveries: number;
  pendingAssemblies: number;
  snapshotData: Record<string, unknown>;
  updatedAt: string;
  isOfflineFallback: boolean;
  pendingUnsyncedSales?: number;
}

export interface OfflineSyncSummary {
  pendingCount: number;
  syncingCount: number;
  rejectedCount: number;
  conflictCount: number;
  hasRejections: boolean;
  isOnline: boolean;
  lastSyncAt?: string;
}
