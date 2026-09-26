import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('react-native', () => ({ Platform: { OS: 'web' } }));

import { deleteInventorySubmission, freezeInventorySubmission, getInventorySubmission } from './inventoryOutbox';
import { getSQLiteDatabase } from './database';
import { runMigrations } from './migrations';
import { saveLocalInventoryDraft } from './inventoryDrafts';

const makeSubmission = (count: number) => ({
  contractVersion: 1 as const, auditId: 'audit-outbox', code: 'LOCAL-1', responsibleName: 'Operador',
  observation: { status: 'completed' }, items: [{ productId: 'p1', variationId: 'v1', physicalCount: count }],
});

describe('outbox de inventário SQLite', () => {
  beforeEach(async () => { await deleteInventorySubmission('audit-outbox'); });

  it('persiste submissão congelada independentemente do draft e do índice', async () => {
    const db = await getSQLiteDatabase();
    await runMigrations(db);
    await db.runAsync('INSERT INTO inventory_drafts_local (id, code, items_json) VALUES (?, ?, ?);', ['audit-outbox', 'LOCAL-1', '[{"physicalCount":3}]']);
    const first = await freezeInventorySubmission(makeSubmission(3));
    expect(await freezeInventorySubmission(makeSubmission(99))).toEqual(first);
    expect((await getInventorySubmission('audit-outbox'))?.items[0].physicalCount).toBe(3);
    expect(await db.getFirstAsync('SELECT * FROM inventory_drafts_local WHERE id = ?;', ['audit-outbox'])).not.toBeNull();
    await expect(saveLocalInventoryDraft({ id: 'audit-outbox', code: 'LOCAL-1', name: 'Contagem', items: [] }))
      .rejects.toThrow('submissão congelada');
    await deleteInventorySubmission('audit-outbox');
    expect(await getInventorySubmission('audit-outbox')).toBeNull();
  });
});
