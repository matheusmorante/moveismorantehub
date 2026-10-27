import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getSQLiteDatabase } from './database';

vi.mock('react-native', () => ({ Platform: { OS: 'web' } }));

import {
  clearAllLocalInventoryDrafts,
  deleteLocalInventoryDraft,
  getLocalInventoryDraft,
  listLocalInventoryDrafts,
  markLocalDraftPendingSync,
  saveLocalInventoryDraft,
} from './inventoryDrafts';

const makeDraft = (id: string, physicalCount: number | null, userId = 'operator-1') => ({
  id,
  userId,
  code: `LOCAL-${id}`,
  name: 'Inventário local',
  responsibleId: 'operator-1',
  responsibleName: 'Colaborador escolhido',
  hasStages: true,
  scopeType: 'supplier',
  supplierId: 'supplier-1',
  items: [
    {
      id: 'item-1',
      key: 'p1-main',
      productId: 'p1',
      name: 'Produto',
      supplierNames: 'Telasul',
      assignedSupplier: 'Telasul',
      systemStock: 4,
      physicalCount,
      countedAt: '2026-09-25T10:00:00Z',
      unit: 'UN',
      sku: 'P1',
    },
  ],
});

describe('rascunho de inventário no SQLite', () => {
  beforeEach(async () => {
    await clearAllLocalInventoryDrafts();
  });

  it('recupera a contagem por ID mesmo sem sessão em memória ou conexão remota', async () => {
    await saveLocalInventoryDraft(makeDraft('audit-a', 30));
    await saveLocalInventoryDraft(makeDraft('audit-b', 2));
    expect((await getLocalInventoryDraft('audit-a', 'operator-1'))?.items[0].physicalCount).toBe(30);
    expect((await getLocalInventoryDraft('audit-b', 'operator-1'))?.items[0].physicalCount).toBe(2);
    expect((await getLocalInventoryDraft('audit-a', 'operator-1'))?.supplierId).toBe('supplier-1');
    expect((await getLocalInventoryDraft('audit-a', 'operator-1'))?.responsibleName).toBe('Colaborador escolhido');
    expect((await getLocalInventoryDraft('audit-a', 'operator-1'))?.items[0].countedAt).toBe(
      '2026-09-25T10:00:00Z'
    );
    expect(await listLocalInventoryDrafts('operator-1')).toHaveLength(2);
  });

  it('atualiza atomicamente o rascunho e preserva quantidade zero', async () => {
    await saveLocalInventoryDraft(makeDraft('audit-a', 3));
    await saveLocalInventoryDraft(makeDraft('audit-a', 0));
    expect((await getLocalInventoryDraft('audit-a', 'operator-1'))?.items[0].physicalCount).toBe(0);
    expect(await listLocalInventoryDrafts('operator-1')).toHaveLength(1);
  });

  it('preserva dados após falha de envio e limpa apenas após confirmação', async () => {
    await saveLocalInventoryDraft(makeDraft('audit-a', 1));
    await markLocalDraftPendingSync('audit-a', 'operator-1');
    expect((await getLocalInventoryDraft('audit-a', 'operator-1'))?.status).toBe('pending_sync');
    await deleteLocalInventoryDraft('audit-a', 'operator-1');
    expect(await getLocalInventoryDraft('audit-a', 'operator-1')).toBeNull();
  });

  it('isola rascunhos, retomada, atualização e exclusão entre usuários no mesmo aparelho', async () => {
    await saveLocalInventoryDraft(makeDraft('audit-shared', 7, 'operator-A'));

    expect(await listLocalInventoryDrafts('operator-A')).toHaveLength(1);
    expect(await listLocalInventoryDrafts('operator-B')).toHaveLength(0);
    expect(await getLocalInventoryDraft('audit-shared', 'operator-B')).toBeNull();

    await markLocalDraftPendingSync('audit-shared', 'operator-B');
    await deleteLocalInventoryDraft('audit-shared', 'operator-B');
    expect((await getLocalInventoryDraft('audit-shared', 'operator-A'))?.status).toBe('in_progress');
    await expect(saveLocalInventoryDraft(makeDraft('audit-shared', 1, 'operator-B'))).rejects.toThrow(
      'pertence a outro usuário'
    );
  });

  it('preserva rascunhos legados sem dono e não os associa automaticamente ao usuário atual', async () => {
    const db = await getSQLiteDatabase();
    await db.runAsync(
      'INSERT INTO inventory_drafts_local (id, code, scope_type, name, status, items_json, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?);',
      ['legacy-audit', 'LOCAL-legacy', 'full', 'Contagem antiga', 'in_progress', '[]', new Date().toISOString()]
    );

    expect(await getLocalInventoryDraft('legacy-audit', 'operator-1')).toBeNull();
    expect(await listLocalInventoryDrafts('operator-1')).toHaveLength(0);
    expect(await db.getFirstAsync('SELECT * FROM inventory_drafts_local WHERE id = ?;', ['legacy-audit'])).not.toBeNull();
  });
});
