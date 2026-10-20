import { getSQLiteDatabase } from '../services/sqlite/database';
import { runMigrations } from '../services/sqlite/migrations';
import { LocalOrder } from '../services/offline/offlineTypes';

interface OrderRow {
  id: string;
  status: string;
  order_type: string | null;
  customer_name: string | null;
  total_amount: number | null;
  order_data: string | Record<string, unknown>;
  version: number;
  updated_at: string;
  synced_at: string | null;
  is_pending_local: number;
}

const parseOrderData = (value: string | Record<string, unknown>): Record<string, unknown> => {
  if (typeof value !== 'string') return value;
  try {
    return JSON.parse(value) as Record<string, unknown>;
  } catch {
    return {};
  }
};

export const OrderRepository = {
  async init(): Promise<void> {
    try {
      await runMigrations();
    } catch (e) {
      console.warn('[OrderRepository] Migrations initialization warning:', e);
    }
  },

  async getById(id: string): Promise<LocalOrder | null> {
    try {
      await this.init();
      const db = await getSQLiteDatabase();
      const row = await db.getFirstAsync<OrderRow>(`SELECT * FROM orders_local WHERE id = ?`, [id]);

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
    } catch (err) {
      console.warn('[OrderRepository] Falha ao buscar pedido por id local:', err);
      return null;
    }
  },

  async list(): Promise<LocalOrder[]> {
    try {
      await this.init();
      const db = await getSQLiteDatabase();
      const rows = await db.getAllAsync<OrderRow>(
        'SELECT * FROM orders_local ORDER BY updated_at DESC'
      );
      return (rows || []).map((row) => ({
        id: row.id,
        status: row.status,
        orderType: row.order_type ?? undefined,
        customerName: row.customer_name ?? undefined,
        totalAmount: row.total_amount ?? undefined,
        orderData: parseOrderData(row.order_data),
        version: row.version,
        updatedAt: row.updated_at,
        syncedAt: row.synced_at ?? undefined,
        isPendingLocal: Boolean(row.is_pending_local),
      }));
    } catch (err) {
      console.warn('[OrderRepository] Falha ao listar pedidos locais:', err);
      return [];
    }
  },

  async listPendingLocal(): Promise<LocalOrder[]> {
    try {
      await this.init();
      const db = await getSQLiteDatabase();
      const rows = await db.getAllAsync<OrderRow>(
        'SELECT * FROM orders_local WHERE is_pending_local = 1'
      );
      return (rows || []).map((row) => ({
        id: row.id,
        status: row.status,
        orderType: row.order_type ?? undefined,
        customerName: row.customer_name ?? undefined,
        totalAmount: row.total_amount ?? undefined,
        orderData: parseOrderData(row.order_data),
        version: row.version,
        updatedAt: row.updated_at,
        syncedAt: row.synced_at ?? undefined,
        isPendingLocal: Boolean(row.is_pending_local),
      }));
    } catch {
      return [];
    }
  },

  /**
   * Sobrepõe alterações locais pendentes de sincronização (`isPendingLocal = true`)
   * sobre listas vindas do servidor para evitar que um SELECT concorrente antes do
   * término do `processQueue()` sobrescreva o estado local otimista.
   */
  async overlayPendingLocalOrders<T extends Record<string, any>>(remoteOrders: T[]): Promise<T[]> {
    try {
      const pendingLocals = await this.listPendingLocal();
      if (pendingLocals.length === 0) return remoteOrders;

      const pendingById = new Map<string, LocalOrder>();
      for (const local of pendingLocals) {
        if (local?.id && local.isPendingLocal) {
          pendingById.set(local.id, local);
        }
      }
      if (pendingById.size === 0) return remoteOrders;

      return remoteOrders.map((remote) => {
        const local = remote?.id ? pendingById.get(String(remote.id)) : undefined;
        if (!local) return remote;
        const localData = (local.orderData || {}) as Record<string, any>;
        const mergedOrderData: Record<string, any> = {
          ...(remote.order_data || {}),
          ...localData,
        };
        const clearableDeliveryKeys = [
          'deliveryStatus',
          'deliveryStartedAt',
          'deliveryArrivedAt',
          'deliveryServiceStartedAt',
          'deliveryFinishedAt',
          'deliveryChecklist',
          'unattendedReason',
          'unattendedNotes',
          'unattendedProofUrl',
          'unattendedProofUrls',
          'unattendedAt',
        ];
        for (const key of clearableDeliveryKeys) {
          if (localData[key] === undefined || localData[key] === null) {
            delete mergedOrderData[key];
          }
        }
        return {
          ...remote,
          status: local.status || remote.status,
          delivery_status: localData.deliveryStatus ?? null,
          delivery_started_at: localData.deliveryStartedAt ?? null,
          delivery_arrived_at: localData.deliveryArrivedAt ?? null,
          delivery_finished_at: localData.deliveryFinishedAt ?? null,
          unattended_reason: localData.unattendedReason ?? null,
          deliveryStatus: localData.deliveryStatus,
          order_data: mergedOrderData,
        };
      });
    } catch {
      return remoteOrders;
    }
  },

  async saveLocal(order: LocalOrder): Promise<void> {
    try {
      await this.init();
      const db = await getSQLiteDatabase();
      const orderDataJson = JSON.stringify(order.orderData || {});

      const existing = await db.getFirstAsync(`SELECT id FROM orders_local WHERE id = ?`, [
        order.id,
      ]);

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
    } catch (err) {
      console.warn('[OrderRepository] Falha ao salvar pedido localmente:', err);
    }
  },
};
