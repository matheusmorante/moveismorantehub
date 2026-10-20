import { createAsyncSingleton } from './asyncSingleton';

export interface DatabaseDriver {
  execAsync(sql: string): Promise<void>;
  runAsync(sql: string, params?: unknown[]): Promise<{ changes: number; lastInsertRowId: number }>;
  getAllAsync<T = unknown>(sql: string, params?: unknown[]): Promise<T[]>;
  getFirstAsync<T = unknown>(sql: string, params?: unknown[]): Promise<T | null>;
}

class InMemoryDatabaseDriver implements DatabaseDriver {
  private tables: Record<string, Record<string, unknown>[]> = {};

  async execAsync(sql: string): Promise<void> {
    const trimmed = sql.trim();
    if (trimmed.toUpperCase().startsWith('CREATE TABLE')) {
      const match = trimmed.match(/CREATE TABLE (?:IF NOT EXISTS )?([a-zA-Z0-9_]+)/i);
      if (match && match[1]) {
        const tableName = match[1];
        if (!this.tables[tableName]) {
          this.tables[tableName] = [];
        }
      }
    }
  }

  async runAsync(
    sql: string,
    params: unknown[] = []
  ): Promise<{ changes: number; lastInsertRowId: number }> {
    const trimmed = sql.trim();
    if (trimmed.toUpperCase().startsWith('INSERT INTO')) {
      const match = trimmed.match(/INSERT INTO ([a-zA-Z0-9_]+)/i);
      if (match && match[1]) {
        const tableName = match[1];
        if (!this.tables[tableName]) this.tables[tableName] = [];

        // Mapeamento de colunas e VALUES (suporta placeholders ? e literais SQL)
        const colsMatch = trimmed.match(/\(([^)]+)\)\s*VALUES\s*\(([^)]+)\)/i);
        if (colsMatch && colsMatch[1]) {
          const cols = colsMatch[1].split(',').map((c) => c.trim());
          const valTokens = colsMatch[2]
            ? colsMatch[2].split(',').map((v) => v.trim())
            : [];
          const row: Record<string, unknown> = {};
          let paramIdx = 0;
          cols.forEach((col, idx) => {
            const token = valTokens[idx];
            if (!token || token === '?') {
              row[col] = params[paramIdx++];
            } else if (/^'.*'$/.test(token)) {
              row[col] = token.slice(1, -1);
            } else if (token.toUpperCase() === 'NULL') {
              row[col] = null;
            } else if (!Number.isNaN(Number(token))) {
              row[col] = Number(token);
            } else {
              row[col] = params[paramIdx++];
            }
          });
          const existingIndex = this.tables[tableName].findIndex((existing) =>
            row.id !== undefined
              ? existing.id === row.id
              : existing.audit_id !== undefined && existing.label_id !== undefined
                ? existing.audit_id === row.audit_id && existing.label_id === row.label_id
                : false
          );
          if (trimmed.toUpperCase().includes('ON CONFLICT') && existingIndex >= 0) {
            if (trimmed.toUpperCase().includes('DO NOTHING'))
              return { changes: 0, lastInsertRowId: 0 };
            this.tables[tableName][existingIndex] = {
              ...this.tables[tableName][existingIndex],
              ...row,
            };
          } else {
            this.tables[tableName].push(row);
          }
          return { changes: 1, lastInsertRowId: this.tables[tableName].length };
        }
      }
    } else if (trimmed.toUpperCase().startsWith('UPDATE')) {
      const match = trimmed.match(/UPDATE ([a-zA-Z0-9_]+) SET/i);
      if (match && match[1]) {
        const tableName = match[1];
        const rows = this.tables[tableName] || [];
        const targetId = params[params.length - 1];
        let changes = 0;
        rows.forEach((r) => {
          if (r.id === targetId) {
            changes++;
            if (trimmed.includes("status = 'pending_sync'")) {
              r.status = 'pending_sync';
              if (params.length >= 2) r.updated_at = params[0];
            } else if (tableName === 'orders_local' && params.length >= 10) {
              r.status = params[0];
              r.order_type = params[1];
              r.customer_name = params[2];
              r.total_amount = params[3];
              r.order_data = params[4];
              r.version = params[5];
              r.updated_at = params[6];
              r.synced_at = params[7];
              r.is_pending_local = params[8];
            } else if (tableName === 'sync_queue' && params.length >= 6) {
              r.status = params[0];
              r.retry_count = Number(r.retry_count || 0) + Number(params[1] || 0);
              if (params[2] !== null && params[2] !== undefined) r.last_error = params[2];
              if (params[3] !== null && params[3] !== undefined) r.conflict_reason = params[3];
              r.updated_at = params[4];
            } else if (tableName === 'inventory_outbox_local' && params.length >= 3) {
              r.retry_count = Number(r.retry_count || 0) + 1;
              r.last_error = params[0];
              r.updated_at = params[1];
            }
          }
        });
        return { changes: changes || 1, lastInsertRowId: 0 };
      }
    } else if (trimmed.toUpperCase().startsWith('DELETE FROM')) {
      const match = trimmed.match(/DELETE FROM ([a-zA-Z0-9_]+)/i);
      if (match && match[1]) {
        const tableName = match[1];
        if (params.length > 0) {
          const initial = (this.tables[tableName] || []).length;
          if (trimmed.includes('WHERE audit_id =')) {
            this.tables[tableName] = (this.tables[tableName] || []).filter(
              (r) => r.audit_id !== params[0]
            );
          } else if (trimmed.includes('WHERE inventory_id =')) {
            this.tables[tableName] = (this.tables[tableName] || []).filter(
              (r) => r.inventory_id !== params[0]
            );
          } else {
            this.tables[tableName] = (this.tables[tableName] || []).filter(
              (r) => r.id !== params[0]
            );
          }
          return { changes: initial - this.tables[tableName].length, lastInsertRowId: 0 };
        }
        this.tables[tableName] = [];
        return { changes: 0, lastInsertRowId: 0 };
      }
    }
    return { changes: 0, lastInsertRowId: 0 };
  }

  async getAllAsync<T = unknown>(sql: string, params: unknown[] = []): Promise<T[]> {
    const match = sql.match(/FROM ([a-zA-Z0-9_]+)/i);
    if (match && match[1]) {
      const tableName = match[1];
      const rows = this.tables[tableName] || [];
      if (sql.includes('WHERE id =') && params.length > 0) {
        return rows.filter((r) => r.id === params[0]) as T[];
      }
      if (sql.includes('WHERE audit_id = ? AND label_id = ?') && params.length >= 2) {
        return rows.filter((r) => r.audit_id === params[0] && r.label_id === params[1]) as T[];
      }
      if (sql.includes("status != 'completed'"))
        return rows.filter((r) => r.status !== 'completed') as T[];
      if (sql.includes("status IN ('pending', 'syncing', 'failed')")) {
        return rows.filter((r) =>
          ['pending', 'syncing', 'failed'].includes(String(r.status))
        ) as T[];
      }
      if (sql.includes("status IN ('conflict', 'rejected')")) {
        return rows.filter((r) => ['conflict', 'rejected'].includes(String(r.status))) as T[];
      }
      if (sql.includes('WHERE is_pending_local = 1')) {
        return rows.filter((r) => Number(r.is_pending_local) === 1) as T[];
      }
      return rows as T[];
    }
    return [];
  }

  async getFirstAsync<T = unknown>(sql: string, params?: unknown[]): Promise<T | null> {
    const all = await this.getAllAsync<T>(sql, params);
    return all.length > 0 ? all[0] : null;
  }
}

export const shouldUseInMemoryDatabase = (platform: string, environment?: string): boolean =>
  platform === 'web' || environment === 'test';

const resolveRuntimePlatform = (): string => {
  if (
    typeof process !== 'undefined' &&
    (process.env?.NODE_ENV === 'test' || process.env?.VITEST)
  ) {
    return 'web';
  }
  const g = globalThis as Record<string, unknown>;
  if (
    g.HermesInternal !== undefined ||
    g.nativeFabricUIManager !== undefined ||
    g.__fbBatchedBridgeConfig !== undefined ||
    (typeof navigator !== 'undefined' && navigator.product === 'ReactNative')
  ) {
    return 'native';
  }
  if (
    typeof window !== 'undefined' &&
    typeof window.document?.createElement === 'function'
  ) {
    return 'web';
  }
  return 'native';
};

const openSQLiteDatabase = async (): Promise<DatabaseDriver> => {
  if (shouldUseInMemoryDatabase(resolveRuntimePlatform(), process.env.NODE_ENV)) {
    return new InMemoryDatabaseDriver();
  }

  try {
    // Carregamento dinâmico de expo-sqlite para ambiente nativo
    const SQLite = require('expo-sqlite');
    return (await SQLite.openDatabaseAsync('morantehub.db')) as DatabaseDriver;
  } catch (e) {
    console.error('[SQLite] Banco nativo indisponível:', e);
    throw new Error(
      'O armazenamento local do aparelho está indisponível. Não é seguro iniciar a contagem.'
    );
  }
};

export const getSQLiteDatabase = createAsyncSingleton(openSQLiteDatabase);
