import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('react-native', () => ({ Platform: { OS: 'web' } }));

import {
  deleteInventorySubmission,
  freezeInventorySubmission,
  getInventorySubmission,
  listInventorySubmissions,
  recordInventorySubmissionFailure,
} from './inventoryOutbox';
import { getSQLiteDatabase } from './database';
import { runMigrations } from './migrations';
import { saveLocalInventoryDraft } from './inventoryDrafts';

const makeSubmission = (count: number) => ({
  contractVersion: 1 as const,
  auditId: 'audit-outbox',
  code: 'LOCAL-1',
  responsibleName: 'Operador',
  userId: 'operator-1',
  observation: { status: 'completed' },
  items: [{ productId: 'p1', variationId: 'v1', physicalCount: count }],
});

describe('outbox de inventário SQLite', () => {
  beforeEach(async () => {
    await deleteInventorySubmission('audit-outbox', 'operator-1');
  });

  it('persiste submissão congelada independentemente do draft e do índice', async () => {
    const db = await getSQLiteDatabase();
    await runMigrations(db);
    await db.runAsync(
      'INSERT INTO inventory_drafts_local (id, code, items_json) VALUES (?, ?, ?);',
      ['audit-outbox', 'LOCAL-1', '[{"physicalCount":3}]']
    );
    const first = await freezeInventorySubmission(makeSubmission(3));
    expect(await freezeInventorySubmission(makeSubmission(99))).toEqual(first);
    expect((await getInventorySubmission('audit-outbox', 'operator-1'))?.items[0].physicalCount).toBe(3);
    expect(
      await db.getFirstAsync('SELECT * FROM inventory_drafts_local WHERE id = ?;', ['audit-outbox'])
    ).not.toBeNull();
    await expect(
      saveLocalInventoryDraft({ id: 'audit-outbox', userId: 'operator-1', code: 'LOCAL-1', name: 'Contagem', items: [] })
    ).rejects.toThrow('submissão congelada');
    await deleteInventorySubmission('audit-outbox', 'operator-1');
    expect(await getInventorySubmission('audit-outbox', 'operator-1')).toBeNull();
  });

  it('não expõe nem remove a submissão congelada de outra conta', async () => {
    const submission = await freezeInventorySubmission(makeSubmission(3));

    expect(await getInventorySubmission('audit-outbox', 'operator-2')).toBeNull();
    await deleteInventorySubmission('audit-outbox', 'operator-2');
    await recordInventorySubmissionFailure(
      'audit-outbox',
      new Error('erro de outra conta'),
      'operator-2'
    );
    await expect(
      freezeInventorySubmission({ ...makeSubmission(99), userId: 'operator-2' })
    ).rejects.toThrow('pertence a outro usuário');
    expect(await getInventorySubmission('audit-outbox', submission.userId)).toEqual(submission);
  });

  it('falha fechado ao listar sem usuário e retorna apenas a outbox da conta ativa', async () => {
    const submission = await freezeInventorySubmission(makeSubmission(3));

    expect(await listInventorySubmissions(null)).toEqual([]);
    expect(await listInventorySubmissions('operator-2')).toEqual([]);
    expect(await listInventorySubmissions('operator-1')).toEqual([submission]);
  });
});
