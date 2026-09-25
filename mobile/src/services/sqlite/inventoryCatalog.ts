import { getSQLiteDatabase } from './database';
import { runMigrations } from './migrations';

const CATALOG_ROW_ID = 'inventory-identification-index';

interface InventoryCatalogRow {
  id: string;
  snapshot_json: string;
  updated_at: string;
}

export const getLocalInventoryCatalogSnapshot = async <T>(): Promise<T | null> => {
  const db = await getSQLiteDatabase();
  await runMigrations(db);
  const row = await db.getFirstAsync<InventoryCatalogRow>(
    'SELECT id, snapshot_json, updated_at FROM inventory_catalog_local WHERE id = ? LIMIT 1;',
    [CATALOG_ROW_ID],
  );
  if (!row) return null;
  try { return JSON.parse(row.snapshot_json) as T; }
  catch (error) {
    console.error('[SQLite] Índice local de inventário inválido:', error);
    return null;
  }
};

export const saveLocalInventoryCatalogSnapshot = async (snapshot: unknown): Promise<void> => {
  const db = await getSQLiteDatabase();
  await runMigrations(db);
  await db.runAsync(
    `INSERT INTO inventory_catalog_local (id, snapshot_json, updated_at) VALUES (?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET snapshot_json = excluded.snapshot_json, updated_at = excluded.updated_at;`,
    [CATALOG_ROW_ID, JSON.stringify(snapshot), new Date().toISOString()],
  );
};
