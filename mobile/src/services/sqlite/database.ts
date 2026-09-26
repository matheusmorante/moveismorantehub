import { Platform } from 'react-native';
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

  async runAsync(sql: string, params: unknown[] = []): Promise<{ changes: number; lastInsertRowId: number }> {
    const trimmed = sql.trim();
    if (trimmed.toUpperCase().startsWith('INSERT INTO')) {
      const match = trimmed.match(/INSERT INTO ([a-zA-Z0-9_]+)/i);
      if (match && match[1]) {
        const tableName = match[1];
        if (!this.tables[tableName]) this.tables[tableName] = [];
        
        // Mapeamento simples de colunas e params
        const colsMatch = trimmed.match(/\(([^)]+)\)\s*VALUES/i);
        if (colsMatch && colsMatch[1]) {
          const cols = colsMatch[1].split(',').map(c => c.trim());
          const row: Record<string, unknown> = {};
          cols.forEach((col, idx) => {
            row[col] = params[idx];
          });
          const existingIndex = this.tables[tableName].findIndex(existing => existing.id === row.id);
          if (trimmed.toUpperCase().includes('ON CONFLICT(ID)') && existingIndex >= 0) {
            if (trimmed.toUpperCase().includes('DO NOTHING')) return { changes: 0, lastInsertRowId: 0 };
            this.tables[tableName][existingIndex] = row;
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
        rows.forEach(r => {
          if (r.id === targetId) {
            changes++;
            if (trimmed.includes("status = 'pending_sync'")) r.status = 'pending_sync';
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
          this.tables[tableName] = (this.tables[tableName] || []).filter(r => r.id !== params[0]);
          return { changes: initial - this.tables[tableName].length, lastInsertRowId: 0 };
        }
        this.tables[tableName] = [];
        return { changes: 1, lastInsertRowId: 0 };
      }
    }
    return { changes: 0, lastInsertRowId: 0 };
  }

  async getAllAsync<T = unknown>(sql: string, params: unknown[] = []): Promise<T[]> {
    const match = sql.match(/FROM ([a-zA-Z0-9_]+)/i);
    if (match && match[1]) {
      const tableName = match[1];
      const rows = (this.tables[tableName] || []) as Record<string, unknown>[];
      if (sql.includes('WHERE id =') && params.length > 0) {
        return rows.filter((r) => r.id === params[0]) as T[];
      }
      if (sql.includes("status != 'completed'")) return rows.filter(r => r.status !== 'completed') as T[];
      return rows as T[];
    }
    return [];
  }

  async getFirstAsync<T = unknown>(sql: string, params: unknown[] = []): Promise<T | null> {
    const all = await this.getAllAsync<T>(sql, params);
    return all.length > 0 ? all[0] : null;
  }
}

export const shouldUseInMemoryDatabase = (platform: string, environment?: string): boolean =>
  platform === 'web' || environment === 'test';

const openSQLiteDatabase = async (): Promise<DatabaseDriver> => {
  if (shouldUseInMemoryDatabase(Platform.OS, process.env.NODE_ENV)) {
    return new InMemoryDatabaseDriver();
  }

  try {
    // Carregamento dinâmico de expo-sqlite para ambiente nativo
    const SQLite = require('expo-sqlite');
    return await SQLite.openDatabaseAsync('morantehub.db') as DatabaseDriver;
  } catch (e) {
    console.error('[SQLite] Banco nativo indisponível:', e);
    throw new Error('O armazenamento local do aparelho está indisponível. Não é seguro iniciar a contagem.');
  }
};

export const getSQLiteDatabase = createAsyncSingleton(openSQLiteDatabase);
