import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { deleteInventorySubmission, freezeInventorySubmission, getInventorySubmission } from './inventoryOutbox';
import { getWebInventoryDraft, saveWebInventoryDraft } from './inventoryLocalDrafts';

const makeSubmission = (count: number) => ({
    contractVersion: 1 as const, auditId: 'audit-outbox', code: 'LOCAL-1', responsibleName: 'Operador',
    observation: { status: 'completed' }, items: [{ productId: 'p1', variationId: 'v1', physicalCount: count }],
});

describe('outbox de inventário IndexedDB', () => {
    beforeEach(async () => { await deleteInventorySubmission('audit-outbox'); });

    it('preserva a primeira submissão após nova leitura e atualização do índice', async () => {
        await saveWebInventoryDraft({ id: 'audit-outbox', code: 'LOCAL-1', date: '2026-09-25', name: 'Contagem',
            responsibleId: 'operator', hasStages: false, status: 'in_progress', items: [], updatedAt: '2026-09-25' });
        const first = await freezeInventorySubmission(makeSubmission(3));
        expect(await freezeInventorySubmission(makeSubmission(99))).toEqual(first);
        expect((await getInventorySubmission('audit-outbox'))?.items[0].physicalCount).toBe(3);
        expect(await getWebInventoryDraft('audit-outbox')).not.toBeNull();
        await expect(saveWebInventoryDraft({ id: 'audit-outbox', code: 'LOCAL-1', date: '2026-09-25', name: 'Contagem',
            responsibleId: 'operator', hasStages: false, status: 'in_progress', items: [], updatedAt: '2026-09-25' }))
            .rejects.toThrow('submissão congelada');
        await deleteInventorySubmission('audit-outbox');
        expect(await getInventorySubmission('audit-outbox')).toBeNull();
    });
});
