import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('react-native', () => ({ Platform: { OS: 'web' } }));

import { clearAllLocalInventoryDrafts, deleteLocalInventoryDraft, getLocalInventoryDraft, listLocalInventoryDrafts, markLocalDraftPendingSync, saveLocalInventoryDraft } from './inventoryDrafts';

const makeDraft = (id: string, physicalCount: number | null) => ({
    id,
    code: `LOCAL-${id}`,
    name: 'Inventário local',
    responsibleId: 'operator-1',
    hasStages: true,
    scopeType: 'supplier', supplierId: 'supplier-1',
    items: [{ id: 'item-1', key: 'p1-main', productId: 'p1', name: 'Produto', supplierNames: 'Telasul', assignedSupplier: 'Telasul', systemStock: 4, physicalCount, countedAt: '2026-09-25T10:00:00Z', unit: 'UN', sku: 'P1' }],
});

describe('rascunho de inventário no SQLite', () => {
    beforeEach(async () => { await clearAllLocalInventoryDrafts(); });

    it('recupera a contagem por ID mesmo sem sessão em memória ou conexão remota', async () => {
        await saveLocalInventoryDraft(makeDraft('audit-a', 30));
        await saveLocalInventoryDraft(makeDraft('audit-b', 2));
        expect((await getLocalInventoryDraft('audit-a'))?.items[0].physicalCount).toBe(30);
        expect((await getLocalInventoryDraft('audit-b'))?.items[0].physicalCount).toBe(2);
        expect((await getLocalInventoryDraft('audit-a'))?.supplierId).toBe('supplier-1');
        expect((await getLocalInventoryDraft('audit-a'))?.items[0].countedAt).toBe('2026-09-25T10:00:00Z');
        expect(await listLocalInventoryDrafts()).toHaveLength(2);
    });

    it('atualiza atomicamente o rascunho e preserva quantidade zero', async () => {
        await saveLocalInventoryDraft(makeDraft('audit-a', 3));
        await saveLocalInventoryDraft(makeDraft('audit-a', 0));
        expect((await getLocalInventoryDraft('audit-a'))?.items[0].physicalCount).toBe(0);
        expect(await listLocalInventoryDrafts()).toHaveLength(1);
    });

    it('preserva dados após falha de envio e limpa apenas após confirmação', async () => {
        await saveLocalInventoryDraft(makeDraft('audit-a', 1));
        await markLocalDraftPendingSync('audit-a');
        expect((await getLocalInventoryDraft('audit-a'))?.status).toBe('pending_sync');
        await deleteLocalInventoryDraft('audit-a');
        expect(await getLocalInventoryDraft('audit-a')).toBeNull();
    });
});
