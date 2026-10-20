import { describe, expect, it, vi } from 'vitest';

vi.mock('react-native', () => ({
  Platform: { OS: 'web' },
}));

import {
  shouldUseInMemoryDatabase,
  resolveRuntimePlatform,
  getSQLiteDatabase,
} from '../../../mobile/src/services/sqlite/database';

describe('SQLite Database Driver — Resiliência de Plataforma (Web & Native)', () => {
  it('identifica ambiente web e teste como aptos para banco em memória', () => {
    expect(shouldUseInMemoryDatabase('web')).toBe(true);
    expect(shouldUseInMemoryDatabase('native', 'test')).toBe(true);
    expect(shouldUseInMemoryDatabase('android', 'production')).toBe(false);
    expect(shouldUseInMemoryDatabase('ios', 'production')).toBe(false);
  });

  it('resolveRuntimePlatform retorna web no ambiente de execução do navegador/testes sem acionar expo-sqlite', () => {
    const platform = resolveRuntimePlatform();
    expect(platform).toBe('web');
  });

  it('fornece instância funcional de InMemoryDatabaseDriver sem erros de ponte nativa', async () => {
    const db = await getSQLiteDatabase();
    expect(db).toBeDefined();

    // Testa operações básicas do driver em memória
    await db.execAsync('CREATE TABLE IF NOT EXISTS test_orders (id TEXT PRIMARY KEY, status TEXT);');
    const insertRes = await db.runAsync('INSERT INTO test_orders (id, status) VALUES (?, ?);', ['ord-1', 'pending']);
    expect(insertRes.changes).toBeGreaterThanOrEqual(1);

    const rows = await db.getAllAsync<{ id: string; status: string }>('SELECT * FROM test_orders WHERE id = ?;', ['ord-1']);
    expect(rows).toHaveLength(1);
    expect(rows[0].status).toBe('pending');
  });
});
