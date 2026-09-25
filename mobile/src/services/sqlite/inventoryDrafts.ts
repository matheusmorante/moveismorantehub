import { getSQLiteDatabase } from './database';
import type { AuditItem } from '../../features/stock/inventory/hooks/useInventoryAuditWorkflow';

export interface LocalInventoryDraft {
  id: string;
  code: string;
  scopeType?: string | null;
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
 * Só deve ser salvo se houver pelo menos uma contagem realizada.
 */
export const saveLocalInventoryDraft = async (draft: {
  id: string;
  code: string;
  scopeType?: string | null;
  name: string;
  responsibleId?: string;
  hasStages?: boolean;
  status?: 'in_progress' | 'pending_sync' | 'completed';
  items: AuditItem[];
}): Promise<void> => {
  const db = await getSQLiteDatabase();
  const updatedAt = new Date().toISOString();
  const itemsJson = JSON.stringify(draft.items);
  const hasStagesInt = draft.hasStages ? 1 : 0;
  const status = draft.status || 'in_progress';

  // Deleta versão anterior com mesmo id para garantir idempotência em qualquer driver
  await db.runAsync(`DELETE FROM inventory_drafts_local WHERE id = ?;`, [draft.id]);

  await db.runAsync(
    `INSERT INTO inventory_drafts_local (id, code, scope_type, name, responsible_id, has_stages, status, items_json, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);`,
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
};

/**
 * Busca o rascunho de inventário local mais recente ou por ID específico.
 */
export const getLocalInventoryDraft = async (id?: string): Promise<LocalInventoryDraft | null> => {
  const db = await getSQLiteDatabase();
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

  try {
    const items: AuditItem[] = JSON.parse(row.items_json || '[]');
    return {
      id: row.id,
      code: row.code,
      scopeType: row.scope_type,
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
  const rows = await db.getAllAsync<LocalInventoryDraftRow>(
    `SELECT * FROM inventory_drafts_local WHERE status != 'completed' ORDER BY updated_at DESC;`
  );

  return rows.map(row => {
    let items: AuditItem[] = [];
    try {
      items = JSON.parse(row.items_json || '[]');
    } catch {}

    return {
      id: row.id,
      code: row.code,
      scopeType: row.scope_type,
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
  await db.runAsync(`DELETE FROM inventory_drafts_local WHERE id = ?;`, [id]);
};

/**
 * Limpa todos os rascunhos de inventário locais.
 */
export const clearAllLocalInventoryDrafts = async (): Promise<void> => {
  const db = await getSQLiteDatabase();
  await db.runAsync(`DELETE FROM inventory_drafts_local;`);
};
