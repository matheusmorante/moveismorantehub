import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { rpc } = vi.hoisted(() => ({ rpc: vi.fn() }));
vi.mock('@/pages/utils/supabaseConfig', () => ({ supabase: { rpc } }));

import { finalizeWebInventory } from './finalizeWebInventory';
import { getWebInventoryDraft, saveWebInventoryDraft } from './inventoryLocalDrafts';

const draft = {
    id: 'audit-commit', code: 'LOCAL-commit', date: '2026-09-25T10:00:00Z', name: 'Teste',
    responsibleId: 'operator-1', hasStages: false, status: 'in_progress' as const,
    updatedAt: '2026-09-25T10:00:00Z', scannedLabelIds: ['label-a'], items: [],
};
const adjustments = [{ productId: 'product-1', variationId: 'variation-1', name: 'Produto', physicalCount: 3, reconciledExpected: 4 }];

describe('commit do inventário web', () => {
    beforeEach(async () => {
        vi.clearAllMocks();
        await saveWebInventoryDraft(draft);
    });

    it('envia um único lote e limpa o IndexedDB depois da resposta confirmada', async () => {
        rpc.mockResolvedValue({ data: { auditId: draft.id, status: 'processed' }, error: null });
        await finalizeWebInventory(draft.id, draft.code, { status: 'completed' }, adjustments);
        expect(rpc).toHaveBeenCalledTimes(1);
        expect(rpc.mock.calls[0][1].p_items[0].previousStock).toBe(4);
        expect(await getWebInventoryDraft(draft.id)).toBeNull();
    });

    it('preserva a contagem quando o Supabase falha e permite retomar com o mesmo ID', async () => {
        rpc.mockResolvedValueOnce({ data: null, error: new Error('offline') })
            .mockResolvedValueOnce({ data: { auditId: draft.id, status: 'already_processed' }, error: null });
        await expect(finalizeWebInventory(draft.id, draft.code, { status: 'completed' }, adjustments)).rejects.toThrow('offline');
        expect((await getWebInventoryDraft(draft.id))?.scannedLabelIds).toEqual(['label-a']);
        await finalizeWebInventory(draft.id, draft.code, { status: 'completed' }, adjustments);
        expect(rpc.mock.calls[0][1].p_audit_id).toBe(rpc.mock.calls[1][1].p_audit_id);
        expect(await getWebInventoryDraft(draft.id)).toBeNull();
    });

    it('não apaga o rascunho diante de resposta sem confirmação', async () => {
        rpc.mockResolvedValue({ data: { auditId: 'outro-id', status: 'processed' }, error: null });
        await expect(finalizeWebInventory(draft.id, draft.code, { status: 'completed' }, adjustments)).rejects.toThrow('não confirmou');
        expect(await getWebInventoryDraft(draft.id)).not.toBeNull();
    });
});
