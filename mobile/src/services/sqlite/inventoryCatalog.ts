import { getSQLiteDatabase } from './database';
import { runMigrations } from './migrations';

const LEGACY_CATALOG_ROW_ID = 'inventory-identification-index';
const CATALOG_ROW_ID = 'inventory-identification-index-v2';

interface InventoryCatalogRow {
  id: string;
  snapshot_json: string;
  updated_at: string;
}

export const getLocalInventoryCatalogSnapshot = async <T>(): Promise<T | null> => {
  const db = await getSQLiteDatabase();
  await runMigrations(db);
  for (const id of [CATALOG_ROW_ID, LEGACY_CATALOG_ROW_ID]) {
    const row = await db.getFirstAsync<InventoryCatalogRow>(
      'SELECT id, snapshot_json, updated_at FROM inventory_catalog_local WHERE id = ? LIMIT 1;',
      [id],
    );
    if (!row) continue;
    try {
      const snapshot = JSON.parse(row.snapshot_json);
      if (snapshot?.products && snapshot?.variations && snapshot?.labels && snapshot?.suppliers && snapshot?.cursors) {
        return snapshot as T;
      }
    } catch (error) {
      console.warn('[SQLite] Índice local de inventário inválido; tentando versão anterior:', error);
    }
  }
  return null;
};

export const saveLocalInventoryCatalogSnapshot = async (snapshot: unknown): Promise<void> => {
  const db = await getSQLiteDatabase();
  await runMigrations(db);
  await db.runAsync(
    `INSERT INTO inventory_catalog_local (id, snapshot_json, updated_at) VALUES (?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET snapshot_json = excluded.snapshot_json, updated_at = excluded.updated_at;`,
    [CATALOG_ROW_ID, JSON.stringify(snapshot), new Date().toISOString()],
  );
  const written = await db.getFirstAsync<InventoryCatalogRow>(
    'SELECT id, snapshot_json, updated_at FROM inventory_catalog_local WHERE id = ? LIMIT 1;',
    [CATALOG_ROW_ID],
  );
  if (!written || written.snapshot_json !== JSON.stringify(snapshot)) {
    throw new Error('Não foi possível confirmar a gravação do novo índice de inventário.');
  }
};
