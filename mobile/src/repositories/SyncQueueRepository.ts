import { ConflictReasonCode, SyncQueueItem, SyncQueueStatus } from '../services/offline/offlineTypes';
import { getSQLiteDatabase } from '../services/sqlite/database';
import { runMigrations } from '../services/sqlite/migrations';

interface QueueRow {
  id: string; entity_type: SyncQueueItem['entityType']; entity_id: string;
  operation: SyncQueueItem['operation']; payload: string; expected_version: number;
  idempotency_key: string; user_id: string | null; status: SyncQueueStatus;
  retry_count: number; last_error: string | null; conflict_reason: ConflictReasonCode | null;
  created_at: string; updated_at: string;
}

const parsePayload = (payload: string): Record<string, unknown> => {
  try { return JSON.parse(payload) as Record<string, unknown>; } catch { return {}; }
};

const toItem = (row: QueueRow): SyncQueueItem => ({
  id: row.id, entityType: row.entity_type, entityId: row.entity_id, operation: row.operation,
  payload: parsePayload(row.payload), expectedVersion: row.expected_version,
  idempotencyKey: row.idempotency_key, userId: row.user_id ?? undefined, status: row.status,
  retryCount: row.retry_count, lastError: row.last_error ?? undefined,
  conflictReason: row.conflict_reason ?? undefined, createdAt: row.created_at, updatedAt: row.updated_at,
});

export const SyncQueueRepository = {
  async listActive(): Promise<SyncQueueItem[]> {
    await runMigrations();
    const db = await getSQLiteDatabase();
    const rows = await db.getAllAsync<QueueRow>(
      "SELECT * FROM sync_queue WHERE status IN ('pending', 'syncing', 'failed') ORDER BY created_at ASC"
    );
    return rows.map(toItem);
  },

  async getSummary(): Promise<Record<SyncQueueStatus, number>> {
    await runMigrations();
    const db = await getSQLiteDatabase();
    const rows = await db.getAllAsync<Pick<QueueRow, 'status'>>("SELECT status FROM sync_queue");
    return rows.reduce<Record<SyncQueueStatus, number>>((counts, row) => {
      counts[row.status] += 1; return counts;
    }, { pending: 0, syncing: 0, synced: 0, failed: 0, conflict: 0, rejected: 0 });
  },

  async insert(item: SyncQueueItem): Promise<void> {
    await runMigrations();
    const db = await getSQLiteDatabase();
    await db.runAsync(
      `INSERT INTO sync_queue (id, entity_type, entity_id, operation, payload, expected_version, idempotency_key, user_id, status, retry_count, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [item.id, item.entityType, item.entityId, item.operation, JSON.stringify(item.payload), item.expectedVersion,
        item.idempotencyKey, item.userId ?? null, item.status, item.retryCount, item.createdAt, item.updatedAt]
    );
  },

  async updateStatus(id: string, status: SyncQueueStatus, options: { error?: string; reason?: ConflictReasonCode; incrementRetry?: boolean } = {}): Promise<void> {
    const db = await getSQLiteDatabase();
    const now = new Date().toISOString();
    await db.runAsync(
      `UPDATE sync_queue SET status = ?, retry_count = retry_count + ?, last_error = ?, conflict_reason = ?, updated_at = ? WHERE id = ?`,
      [status, options.incrementRetry ? 1 : 0, options.error ?? null, options.reason ?? null, now, id]
    );
  },
};
