import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { rpc } = vi.hoisted(() => ({ rpc: vi.fn() }));
vi.mock('@/pages/utils/supabaseConfig', () => ({ supabase: { rpc } }));

import { finalizeWebInventory } from './finalizeWebInventory';
import { getWebInventoryDraft, saveWebInventoryDraft } from './inventoryLocalDrafts';
import { deleteInventorySubmission, getInventorySubmission } from './inventoryOutbox';

const draft = {
    id: 'audit-commit', code: 'LOCAL-commit', date: '2026-09-25T10:00:00Z', name: 'Teste',
    responsibleId: 'operator-1', hasStages: false, status: 'in_progress' as const,
    updatedAt: '2026-09-25T10:00:00Z', scannedLabelIds: ['label-a'], items: [],
};
const adjustments = [{ productId: 'product-1', variationId: 'variation-1', name: 'Produto', physicalCount: 3, reconciledExpected: 4 }];

describe('commit do inventário web', () => {
    beforeEach(async () => {
        vi.clearAllMocks();
        vi.stubEnv('VITE_INVENTORY_RPC_V2', 'false');
        await deleteInventorySubmission(draft.id);
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
        expect((await getInventorySubmission(draft.id))?.items[0].physicalCount).toBe(3);
        await finalizeWebInventory(draft.id, draft.code, { status: 'changed' }, [{ ...adjustments[0], physicalCount: 99 }]);
        expect(rpc.mock.calls[0][1].p_audit_id).toBe(rpc.mock.calls[1][1].p_audit_id);
        expect(rpc.mock.calls[0][1]).toEqual(rpc.mock.calls[1][1]);
        expect(await getWebInventoryDraft(draft.id)).toBeNull();
    });

    it('não apaga o rascunho diante de resposta sem confirmação', async () => {
        rpc.mockResolvedValue({ data: { auditId: 'outro-id', status: 'processed' }, error: null });
        await expect(finalizeWebInventory(draft.id, draft.code, { status: 'completed' }, adjustments)).rejects.toThrow('não confirmou');
        expect(await getWebInventoryDraft(draft.id)).not.toBeNull();
    });

    it('envia todas as contagens com horário pela RPC v2 quando habilitada', async () => {
        vi.stubEnv('VITE_INVENTORY_RPC_V2', 'true');
        rpc.mockResolvedValue({ data: { auditId: draft.id, status: 'processed', moves: [] }, error: null });
        await finalizeWebInventory(draft.id, draft.code,
            { inventoryAudit: true, inventoryCode: draft.code, status: 'completed',
                items: [{ productId: 'product-1', variationId: 'variation-1', physicalCount: 3, countedAt: '2026-09-25T10:00:00Z' },
                    { productId: 'product-2', variationId: 'variation-2', physicalCount: 4, countedAt: '2026-09-25T10:00:00Z' }] },
            [{ ...adjustments[0], countedAt: '2026-09-25T10:00:00Z' },
                { productId: 'product-2', variationId: 'variation-2', name: 'Sem diferença', physicalCount: 4,
                    reconciledExpected: 4, countedAt: '2026-09-25T10:00:00Z' }]);
        expect(rpc.mock.calls[0][0]).toBe('finalize_inventory_transaction_v2');
        expect(rpc.mock.calls[0][1].p_items[0].countedAt).toBe('2026-09-25T10:00:00Z');
        expect(rpc.mock.calls[0][1].p_items).toHaveLength(2);
    });
});
