import { getSQLiteDatabase } from '../services/sqlite/database';
import { runMigrations } from '../services/sqlite/migrations';
import { LocalOrder } from '../services/offline/offlineTypes';

interface OrderRow {
  id: string; status: string; order_type: string | null; customer_name: string | null;
  total_amount: number | null; order_data: string | Record<string, unknown>; version: number;
  updated_at: string; synced_at: string | null; is_pending_local: number;
}

const parseOrderData = (value: string | Record<string, unknown>): Record<string, unknown> => {
  if (typeof value !== 'string') return value;
  try { return JSON.parse(value) as Record<string, unknown>; } catch { return {}; }
};

export const OrderRepository = {
  async init(): Promise<void> {
    await runMigrations();
  },

  async getById(id: string): Promise<LocalOrder | null> {
    const db = await getSQLiteDatabase();
    const row = await db.getFirstAsync<OrderRow>(
      `SELECT * FROM orders_local WHERE id = ?`,
      [id]
    );

    if (!row) return null;

    return {
      id: row.id,
      status: row.status,
      orderType: row.order_type,
      customerName: row.customer_name,
      totalAmount: row.total_amount,
      orderData: parseOrderData(row.order_data),
      version: row.version,
      updatedAt: row.updated_at,
      syncedAt: row.synced_at,
      isPendingLocal: Boolean(row.is_pending_local),
    };
  },

  async list(): Promise<LocalOrder[]> {
    const db = await getSQLiteDatabase();
    const rows = await db.getAllAsync<OrderRow>('SELECT * FROM orders_local ORDER BY updated_at DESC');
    return rows.map((row) => ({ id: row.id, status: row.status, orderType: row.order_type ?? undefined,
      customerName: row.customer_name ?? undefined, totalAmount: row.total_amount ?? undefined,
      orderData: parseOrderData(row.order_data), version: row.version, updatedAt: row.updated_at,
      syncedAt: row.synced_at ?? undefined, isPendingLocal: Boolean(row.is_pending_local) }));
  },

  async saveLocal(order: LocalOrder): Promise<void> {
    const db = await getSQLiteDatabase();
    const orderDataJson = JSON.stringify(order.orderData);

    const existing = await db.getFirstAsync(`SELECT id FROM orders_local WHERE id = ?`, [order.id]);

    if (existing) {
      await db.runAsync(
        `UPDATE orders_local 
         SET status = ?, order_type = ?, customer_name = ?, total_amount = ?, order_data = ?, version = ?, updated_at = ?, synced_at = ?, is_pending_local = ?
         WHERE id = ?`,
        [
          order.status,
          order.orderType || null,
          order.customerName || null,
          order.totalAmount || 0,
          orderDataJson,
          order.version,
          order.updatedAt,
          order.syncedAt || null,
          order.isPendingLocal ? 1 : 0,
          order.id,
        ]
      );
    } else {
      await db.runAsync(
        `INSERT INTO orders_local (id, status, order_type, customer_name, total_amount, order_data, version, updated_at, synced_at, is_pending_local)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          order.id,
          order.status,
          order.orderType || null,
          order.customerName || null,
          order.totalAmount || 0,
          orderDataJson,
          order.version,
          order.updatedAt,
          order.syncedAt || null,
          order.isPendingLocal ? 1 : 0,
        ]
      );
    }
  },
};
