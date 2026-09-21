import { getSQLiteDatabase } from './database';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';

export interface InventoryScan {
  id: string;
  inventory_id: string;
  product_id: string;
  variation_id: string | null;
  scan_id: string;
  scanned_at: string;
  status: 'pending' | 'syncing' | 'confirmed' | 'rejected';
}

export const getInventoryScans = async (inventoryId: string): Promise<InventoryScan[]> => {
  const db = await getSQLiteDatabase();
  return db.getAllAsync<InventoryScan>(
    `SELECT * FROM inventory_scans_local WHERE inventory_id = ? ORDER BY scanned_at DESC;`,
    [inventoryId]
  );
};

export const getProductScanCount = async (inventoryId: string, productId: string): Promise<number> => {
  const db = await getSQLiteDatabase();
  const rows = await db.getAllAsync<{ count: number }>(
    `SELECT COUNT(*) as count FROM inventory_scans_local WHERE inventory_id = ? AND product_id = ?;`,
    [inventoryId, productId]
  );
  return rows[0]?.count || 0;
};

export const addInventoryScan = async (
  inventoryId: string,
  productId: string,
  variationId: string | null,
  scanId: string
): Promise<{ success: boolean; error?: string }> => {
  const db = await getSQLiteDatabase();
  const id = uuidv4();
  const scannedAt = new Date().toISOString();

  try {
    await db.runAsync(
      `INSERT INTO inventory_scans_local (id, inventory_id, product_id, variation_id, scan_id, scanned_at, status) 
       VALUES (?, ?, ?, ?, ?, ?, 'pending');`,
      [id, inventoryId, productId, variationId, scanId, scannedAt]
    );
    return { success: true };
  } catch (err: any) {
    if (err?.message?.includes('UNIQUE constraint failed') || err?.message?.includes('ConstraintError')) {
      return { success: false, error: 'duplicate' };
    }
    return { success: false, error: err?.message || 'unknown' };
  }
};

export const removeLatestScanForProduct = async (inventoryId: string, productId: string): Promise<void> => {
  const db = await getSQLiteDatabase();
  const latest = await db.getFirstAsync<{ id: string }>(
    `SELECT id FROM inventory_scans_local WHERE inventory_id = ? AND product_id = ? ORDER BY scanned_at DESC LIMIT 1;`,
    [inventoryId, productId]
  );
  if (latest) {
    await db.runAsync(`DELETE FROM inventory_scans_local WHERE id = ?;`, [latest.id]);
  }
};

export const clearInventoryScans = async (inventoryId: string): Promise<void> => {
  const db = await getSQLiteDatabase();
  await db.runAsync(`DELETE FROM inventory_scans_local WHERE inventory_id = ?;`, [inventoryId]);
};
