import { getSQLiteDatabase } from './database';
import { runMigrations } from './migrations';

export interface InventorySubmission {
  contractVersion: 1 | 2;
  auditId: string;
  code: string;
  observation: Record<string, unknown>;
  items: Array<Record<string, unknown>>;
  responsibleName: string;
  userId?: string;
}

interface OutboxRow {
  id: string;
  payload_json: string;
  status: string;
  retry_count: number;
  last_error: string | null;
}

const readInventorySubmission = async (auditId: string): Promise<InventorySubmission | null> => {
  const db = await getSQLiteDatabase();
  await runMigrations(db);
  const row = await db.getFirstAsync<OutboxRow>(
    'SELECT * FROM inventory_outbox_local WHERE id = ? LIMIT 1;',
    [auditId]
  );
  if (!row) return null;
  const payload = JSON.parse(row.payload_json) as InventorySubmission;
  if (![1, 2].includes(payload.contractVersion) || payload.auditId !== auditId)
    throw new Error('Submissão local de inventário inválida.');
  return payload;
};

export const getInventorySubmission = async (
  auditId: string,
  userId?: string | null
): Promise<InventorySubmission | null> => {
  if (!userId) return null;
  const submission = await readInventorySubmission(auditId);
  return submission?.userId === userId ? submission : null;
};

export const freezeInventorySubmission = async (
  submission: InventorySubmission
): Promise<InventorySubmission> => {
  if (!submission.userId?.trim()) {
    throw new Error('Não é possível congelar um inventário sem o usuário autenticado.');
  }
  const db = await getSQLiteDatabase();
  await runMigrations(db);
  const existing = await readInventorySubmission(submission.auditId);
  if (existing) {
    if (existing.userId === submission.userId) return existing;
    throw new Error('Este inventário local pertence a outro usuário.');
  }
  const now = new Date().toISOString();
  await db.runAsync(
    `INSERT INTO inventory_outbox_local (id, payload_json, status, retry_count, last_error, created_at, updated_at)
     VALUES (?, ?, 'pending', 0, NULL, ?, ?) ON CONFLICT(id) DO NOTHING;`,
    [submission.auditId, JSON.stringify(submission), now, now]
  );
  const stored = await getInventorySubmission(submission.auditId, submission.userId);
  if (!stored) throw new Error('Não foi possível confirmar a submissão local do inventário.');
  return stored;
};

export const recordInventorySubmissionFailure = async (
  auditId: string,
  error: unknown,
  userId?: string | null
): Promise<void> => {
  if (!userId || !(await getInventorySubmission(auditId, userId))) return;
  const db = await getSQLiteDatabase();
  await db.runAsync(
    `UPDATE inventory_outbox_local SET retry_count = retry_count + 1, last_error = ?, updated_at = ? WHERE id = ?;`,
    [
      String(error instanceof Error ? error.message : error).slice(0, 500),
      new Date().toISOString(),
      auditId,
    ]
  );
};

export const deleteInventorySubmission = async (
  auditId: string,
  userId?: string | null
): Promise<void> => {
  if (!userId || !(await getInventorySubmission(auditId, userId))) return;
  const db = await getSQLiteDatabase();
  await db.runAsync('DELETE FROM inventory_outbox_local WHERE id = ?;', [auditId]);
};

export const listInventorySubmissions = async (
  userId: string | null
): Promise<InventorySubmission[]> => {
  if (!userId) return [];
  const db = await getSQLiteDatabase();
  await runMigrations(db);
  const rows = await db.getAllAsync<OutboxRow>(
    'SELECT * FROM inventory_outbox_local ORDER BY created_at ASC;'
  );
  const submissions: InventorySubmission[] = [];
  for (const row of rows) {
    try {
      const payload = JSON.parse(row.payload_json) as InventorySubmission;
      if ([1, 2].includes(payload.contractVersion) && payload.auditId === row.id) {
        if (payload.userId === userId) submissions.push(payload);
      }
    } catch {
      // ignora linhas corrompidas
    }
  }
  return submissions;
};
