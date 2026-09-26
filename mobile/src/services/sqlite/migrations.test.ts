import { describe, expect, it, vi } from 'vitest';
import { runMigrations } from './migrations';

vi.mock('react-native', () => ({ Platform: { OS: 'web' } }));

type RunAsync = (sql: string, params?: unknown[]) => Promise<{ changes: number; lastInsertRowId: number }>;

const makeDriver = (runAsync: RunAsync = async () => ({ changes: 1, lastInsertRowId: 1 })) => {
  const statements: string[] = [];
  const driver = {
    execAsync: vi.fn(async (sql: string) => { statements.push(sql); }),
    runAsync: vi.fn(runAsync),
    getAllAsync: vi.fn(async () => []),
    getFirstAsync: vi.fn(async () => null),
  };
  return { driver, statements };
};

describe('migrações SQLite do inventário', () => {
  it('adiciona outbox e escopo sem apagar tabelas ou dados anteriores', async () => {
    const { driver, statements } = makeDriver();

    await runMigrations(driver);

    const schema = statements.join('\n');
    expect(schema).toContain('CREATE TABLE IF NOT EXISTS inventory_drafts_local');
    expect(schema).toContain('CREATE TABLE IF NOT EXISTS inventory_catalog_local');
    expect(schema).toContain('CREATE TABLE IF NOT EXISTS inventory_outbox_local');
    expect(schema).toContain('CREATE TABLE IF NOT EXISTS inventory_draft_scope_local');
    expect(schema).not.toMatch(/\b(?:DROP|DELETE)\s+(?:TABLE|FROM)\b/i);
    expect(driver.runAsync).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO schema_migrations'),
      expect.arrayContaining([2, 'inventory_outbox_local']),
    );
    expect(driver.runAsync).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO schema_migrations'),
      expect.arrayContaining([3, 'inventory_draft_scope_local']),
    );
  });

  it('permite tentar novamente quando uma migração falha', async () => {
    let shouldFail = true;
    const { driver } = makeDriver(async () => {
      if (shouldFail) {
        shouldFail = false;
        throw new Error('falha temporária');
      }
      return { changes: 1, lastInsertRowId: 1 };
    });

    await expect(runMigrations(driver)).rejects.toThrow('falha temporária');
    await expect(runMigrations(driver)).resolves.toBeUndefined();
  });
});
