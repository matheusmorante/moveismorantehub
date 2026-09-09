import { DatabaseDriver, getSQLiteDatabase } from './database';

export const runMigrations = async (db?: DatabaseDriver): Promise<void> => {
  const driver = db || (await getSQLiteDatabase());

  // 1. Tabela de controle de migrações
  await driver.execAsync(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at TEXT NOT NULL
    );
  `);

  // 2. Fila de Sincronização (sync_queue)
  await driver.execAsync(`
    CREATE TABLE IF NOT EXISTS sync_queue (
      id TEXT PRIMARY KEY,
      entity_type TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      operation TEXT NOT NULL,
      payload TEXT NOT NULL,
      expected_version INTEGER NOT NULL DEFAULT 1,
      idempotency_key TEXT NOT NULL,
      user_id TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      retry_count INTEGER NOT NULL DEFAULT 0,
      last_error TEXT,
      conflict_reason TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);
  await driver.execAsync(`CREATE INDEX IF NOT EXISTS idx_sync_queue_status_created_at ON sync_queue(status, created_at);`);
  await driver.execAsync(`CREATE INDEX IF NOT EXISTS idx_sync_queue_entity ON sync_queue(entity_type, entity_id);`);

  // 3. Cache local de Pedidos (orders_local)
  await driver.execAsync(`
    CREATE TABLE IF NOT EXISTS orders_local (
      id TEXT PRIMARY KEY,
      status TEXT NOT NULL,
      order_type TEXT,
      customer_name TEXT,
      total_amount REAL,
      order_data TEXT NOT NULL,
      version INTEGER NOT NULL DEFAULT 1,
      updated_at TEXT NOT NULL,
      synced_at TEXT,
      is_pending_local INTEGER NOT NULL DEFAULT 0
    );
  `);

  // 4. Cache local de Transações Financeiras (financial_transactions_local)
  await driver.execAsync(`
    CREATE TABLE IF NOT EXISTS financial_transactions_local (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      amount REAL NOT NULL,
      description TEXT,
      category TEXT,
      transaction_data TEXT NOT NULL,
      version INTEGER NOT NULL DEFAULT 1,
      updated_at TEXT NOT NULL,
      is_pending_local INTEGER NOT NULL DEFAULT 0
    );
  `);

  // 5. Cache local do Dashboard (dashboard_snapshots_local)
  await driver.execAsync(`
    CREATE TABLE IF NOT EXISTS dashboard_snapshots_local (
      id TEXT PRIMARY KEY,
      total_sales REAL NOT NULL,
      total_orders INTEGER NOT NULL,
      pending_deliveries INTEGER NOT NULL,
      pending_assemblies INTEGER NOT NULL,
      snapshot_data TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      is_offline_fallback INTEGER NOT NULL DEFAULT 0,
      pending_unsynced_sales REAL DEFAULT 0
    );
  `);

  // 6. Fila local de Mídia/Arquivos (media_queue_local)
  await driver.execAsync(`
    CREATE TABLE IF NOT EXISTS media_queue_local (
      id TEXT PRIMARY KEY,
      sync_queue_id TEXT,
      entity_type TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      local_uri TEXT NOT NULL,
      storage_bucket TEXT NOT NULL,
      storage_path TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at TEXT NOT NULL
    );
  `);

  await driver.execAsync(`
    CREATE TABLE IF NOT EXISTS sync_metadata_local (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);
};
