import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { deleteWebInventoryDraft, getWebInventoryDraft, listWebInventoryDrafts, saveWebInventoryDraft, type WebInventoryDraft } from './inventoryLocalDrafts';

const makeDraft = (id: string, count: number | null): WebInventoryDraft => ({
    id,
    code: `LOCAL-${id}`,
    date: '2026-09-25T10:00:00.000Z',
    name: 'Inventário de teste',
    responsibleId: 'operator-1',
    hasStages: true,
    scopeType: 'full',
    status: 'in_progress',
    updatedAt: new Date().toISOString(),
    items: [{ id: 'item-1', key: 'p1-main', productId: 'p1', name: 'Produto', supplierNames: 'Telasul', assignedSupplier: 'Telasul', systemStock: 4, physicalCount: count, unit: 'UN', sku: 'P1' }],
    scannedLabelIds: [],
});

describe('rascunho de inventário no IndexedDB', () => {
    beforeEach(async () => {
        for (const draft of await listWebInventoryDrafts()) await deleteWebInventoryDraft(draft.id);
    });

    it('recupera a contagem após reabrir a conexão e separa inventários por ID', async () => {
        await saveWebInventoryDraft(makeDraft('audit-a', 30));
        await saveWebInventoryDraft(makeDraft('audit-b', 2));
        expect((await getWebInventoryDraft('audit-a'))?.items[0].physicalCount).toBe(30);
        expect((await getWebInventoryDraft('audit-b'))?.items[0].physicalCount).toBe(2);
        expect(await listWebInventoryDrafts()).toHaveLength(2);
    });

    it('persiste zero e a identidade das etiquetas em uma única atualização', async () => {
        await saveWebInventoryDraft(makeDraft('audit-a', 3));
        const corrected = makeDraft('audit-a', 0);
        corrected.scannedLabelIds = ['label-1', 'label-2'];
        await saveWebInventoryDraft(corrected);
        const restored = await getWebInventoryDraft('audit-a');
        expect(restored?.items[0].physicalCount).toBe(0);
        expect(restored?.scannedLabelIds).toEqual(['label-1', 'label-2']);
        expect(await listWebInventoryDrafts()).toHaveLength(1);
    });

    it('mantém o inventário em andamento até a limpeza explícita após o commit', async () => {
        await saveWebInventoryDraft(makeDraft('audit-a', 1));
        expect((await getWebInventoryDraft('audit-a'))?.status).toBe('in_progress');
        await deleteWebInventoryDraft('audit-a');
        expect(await getWebInventoryDraft('audit-a')).toBeNull();
    });
});
