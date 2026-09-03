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

export interface SyncEvent<T = any> {
  eventId: string; // UUID v4 único e idempotente
  type: SyncEventType;
  entityType: 'order' | 'assembly' | 'inventory' | 'goods_receipt';
  entityId: string;
  state: SyncEventState;
  occurredAt: string; // ISO timestamp do momento em que a ação ocorreu
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

export interface OfflineSyncSummary {
  pendingCount: number;
  syncingCount: number;
  rejectedCount: number;
  hasRejections: boolean;
  isOnline: boolean;
  lastSyncAt?: string;
}
