import { getSQLiteDatabase } from './database';
import { runMigrations } from './migrations';
import { getInventorySubmission } from './inventoryOutbox';
import type { AuditItem } from '../../features/stock/inventory/hooks/useInventoryAuditWorkflow';

export interface LocalInventoryDraft {
  id: string;
  code: string;
  scopeType?: string | null;
  supplierId?: string;
  name: string;
  responsibleId?: string;
  hasStages: boolean;
  status: 'in_progress' | 'pending_sync' | 'completed';
  items: AuditItem[];
  updatedAt: string;
}

interface LocalInventoryDraftRow {
  id: string;
  code: string;
  scope_type: string | null;
  name: string;
  responsible_id: string | null;
  has_stages: number;
  status: string;
  items_json: string;
  updated_at: string;
}

/**
 * Salva ou atualiza um rascunho de inventário localmente no SQLite.
 * Inclui o escopo mesmo antes da primeira leitura para permitir retomada offline.
 */
export const saveLocalInventoryDraft = async (draft: {
  id: string;
  code: string;
  scopeType?: string | null;
  supplierId?: string;
  name: string;
  responsibleId?: string;
  hasStages?: boolean;
  status?: 'in_progress' | 'pending_sync' | 'completed';
  items: AuditItem[];
}): Promise<void> => {
  const db = await getSQLiteDatabase();
  await runMigrations(db);
  if (await getInventorySubmission(draft.id)) {
    throw new Error('Este inventário já possui submissão congelada. A contagem não pode ser editada durante o envio.');
  }
  const updatedAt = new Date().toISOString();
  const itemsJson = JSON.stringify(draft.items);
  const hasStagesInt = draft.hasStages ? 1 : 0;
  const status = draft.status || 'in_progress';

  await db.runAsync(
    `INSERT INTO inventory_drafts_local (id, code, scope_type, name, responsible_id, has_stages, status, items_json, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       code = excluded.code, scope_type = excluded.scope_type, name = excluded.name,
       responsible_id = excluded.responsible_id, has_stages = excluded.has_stages,
       status = excluded.status, items_json = excluded.items_json, updated_at = excluded.updated_at;`,
    [
      draft.id,
      draft.code,
      draft.scopeType || 'custom',
      draft.name,
      draft.responsibleId || null,
      hasStagesInt,
      status,
      itemsJson,
      updatedAt,
    ]
  );
  await db.runAsync(
    `INSERT INTO inventory_draft_scope_local (id, supplier_id, updated_at) VALUES (?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET supplier_id = excluded.supplier_id, updated_at = excluded.updated_at;`,
    [draft.id, draft.supplierId || null, updatedAt],
  );
};

/**
 * Busca o rascunho de inventário local mais recente ou por ID específico.
 */
export const getLocalInventoryDraft = async (id?: string): Promise<LocalInventoryDraft | null> => {
  const db = await getSQLiteDatabase();
  await runMigrations(db);
  let row: LocalInventoryDraftRow | null = null;

  if (id) {
    row = await db.getFirstAsync<LocalInventoryDraftRow>(
      `SELECT * FROM inventory_drafts_local WHERE id = ? LIMIT 1;`,
      [id]
    );
  } else {
    row = await db.getFirstAsync<LocalInventoryDraftRow>(
      `SELECT * FROM inventory_drafts_local ORDER BY updated_at DESC LIMIT 1;`
    );
  }

  if (!row) return null;
  const scope = await db.getFirstAsync<{ supplier_id: string | null }>(
    'SELECT supplier_id FROM inventory_draft_scope_local WHERE id = ? LIMIT 1;', [row.id]);

  try {
    const items: AuditItem[] = JSON.parse(row.items_json || '[]');
    return {
      id: row.id,
      code: row.code,
      scopeType: row.scope_type,
      supplierId: scope?.supplier_id || undefined,
      name: row.name,
      responsibleId: row.responsible_id || undefined,
      hasStages: Boolean(row.has_stages),
      status: (row.status as any) || 'in_progress',
      items,
      updatedAt: row.updated_at,
    };
  } catch (e) {
    console.error('[SQLite] Erro ao fazer parse de items_json do rascunho local:', e);
    return null;
  }
};

/**
 * Lista todos os rascunhos de inventário locais ainda não finalizados no backend.
 */
export const listLocalInventoryDrafts = async (): Promise<LocalInventoryDraft[]> => {
  const db = await getSQLiteDatabase();
  await runMigrations(db);
  const rows = await db.getAllAsync<LocalInventoryDraftRow>(
    `SELECT * FROM inventory_drafts_local WHERE status != 'completed' ORDER BY updated_at DESC;`
  );

  const scopes = await db.getAllAsync<{ id: string; supplier_id: string | null }>('SELECT id, supplier_id FROM inventory_draft_scope_local;');
  const supplierById = new Map(scopes.map(scope => [scope.id, scope.supplier_id]));
  return rows.map(row => {
    let items: AuditItem[] = [];
    try {
      items = JSON.parse(row.items_json || '[]');
    } catch {}

    return {
      id: row.id,
      code: row.code,
      scopeType: row.scope_type,
      supplierId: supplierById.get(row.id) || undefined,
      name: row.name,
      responsibleId: row.responsible_id || undefined,
      hasStages: Boolean(row.has_stages),
      status: (row.status as any) || 'in_progress',
      items,
      updatedAt: row.updated_at,
    };
  });
};

/**
 * Marca um rascunho local como pendente de sincronização (ex: tentativa de envio offline).
 */
export const markLocalDraftPendingSync = async (id: string): Promise<void> => {
  const db = await getSQLiteDatabase();
  await runMigrations(db);
  await db.runAsync(
    `UPDATE inventory_drafts_local SET status = 'pending_sync', updated_at = ? WHERE id = ?;`,
    [new Date().toISOString(), id]
  );
};

/**
 * Remove um rascunho local específico (ex: quando o inventário é confirmado pelo Supabase).
 */
export const deleteLocalInventoryDraft = async (id: string): Promise<void> => {
  const db = await getSQLiteDatabase();
  await runMigrations(db);
  await db.runAsync(`DELETE FROM inventory_drafts_local WHERE id = ?;`, [id]);
  await db.runAsync(`DELETE FROM inventory_draft_scope_local WHERE id = ?;`, [id]);
};

/**
 * Limpa todos os rascunhos de inventário locais.
 */
export const clearAllLocalInventoryDrafts = async (): Promise<void> => {
  const db = await getSQLiteDatabase();
  await runMigrations(db);
  await db.runAsync(`DELETE FROM inventory_drafts_local;`);
  await db.runAsync(`DELETE FROM inventory_draft_scope_local;`);
};
