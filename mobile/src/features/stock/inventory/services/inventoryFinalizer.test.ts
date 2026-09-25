import { beforeEach, describe, expect, it, vi } from 'vitest';

const { rpc, removeDraft, markPending, alert, connected } = vi.hoisted(() => ({
    rpc: vi.fn(),
    removeDraft: vi.fn(),
    markPending: vi.fn(),
    alert: vi.fn(),
    connected: { connected: true },
}));

vi.mock('react-native', () => ({ Alert: { alert }, Platform: { OS: 'android' } }));
vi.mock('../../../../services/supabaseClient', () => ({ supabase: { rpc } }));
vi.mock('../../../../services/sqlite/inventoryDrafts', () => ({ deleteLocalInventoryDraft: removeDraft, markLocalDraftPendingSync: markPending }));
vi.mock('../../../../services/offline/connectivityService', () => ({ connectivityService: connected }));

import { executeInventoryFinalization } from './inventoryFinalizer';

const makeParams = () => ({
    items: [{ id: 'item-1', key: 'p1-main', productId: 'p1', name: 'Produto', supplierNames: 'Telasul', assignedSupplier: 'Telasul', systemStock: 4, physicalCount: 3, unit: 'UN' }],
    itemsWithAdjustment: [{ id: 'item-1', key: 'p1-main', productId: 'p1', variationId: 'v1', name: 'Produto', supplierNames: 'Telasul', assignedSupplier: 'Telasul', systemStock: 4, physicalCount: 3, unit: 'UN', reconciledExpected: 4, difference: -1 }],
    scopeConfig: { name: 'Contagem', hasStages: false, responsibleId: 'operator-1' },
    draftRef: { current: { id: 'audit-1', code: 'LOCAL-audit1' } },
    userProfile: { id: 'operator-1', full_name: 'Operador' },
    onClose: vi.fn(),
});

describe('conclusão do inventário mobile', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        connected.connected = true;
        removeDraft.mockResolvedValue(undefined);
        markPending.mockResolvedValue(undefined);
    });

    it('envia um único commit consolidado e remove o rascunho somente após confirmação', async () => {
        rpc.mockResolvedValue({ data: { auditId: 'audit-1', status: 'processed' }, error: null });
        const params = makeParams();
        expect(await executeInventoryFinalization(params)).toBe(true);
        expect(rpc).toHaveBeenCalledTimes(1);
        expect(rpc.mock.calls[0][1].p_items).toEqual([{ productId: 'p1', variationId: 'v1', name: 'Produto', physicalCount: 3, previousStock: 4 }]);
        expect(rpc.mock.invocationCallOrder[0]).toBeLessThan(removeDraft.mock.invocationCallOrder[0]);
        expect(removeDraft).toHaveBeenCalledWith('audit-1');
    });

    it('preserva o rascunho numa falha e reenvia com o mesmo ID na tentativa seguinte', async () => {
        rpc.mockResolvedValueOnce({ data: null, error: new Error('network') })
            .mockResolvedValueOnce({ data: { auditId: 'audit-1', status: 'already_processed' }, error: null });
        const params = makeParams();
        expect(await executeInventoryFinalization(params)).toBe(false);
        expect(removeDraft).not.toHaveBeenCalled();
        expect(await executeInventoryFinalization(params)).toBe(true);
        expect(rpc.mock.calls[0][1].p_audit_id).toBe(rpc.mock.calls[1][1].p_audit_id);
        expect(removeDraft).toHaveBeenCalledTimes(1);
    });

    it('aguarda rede sem perder contagens', async () => {
        connected.connected = false;
        expect(await executeInventoryFinalization(makeParams())).toBe(false);
        expect(rpc).not.toHaveBeenCalled();
        expect(removeDraft).not.toHaveBeenCalled();
        expect(markPending).toHaveBeenCalledWith('audit-1');
    });

    it('não conclui quando há etapa sem contagem', async () => {
        const params = makeParams();
        params.scopeConfig.hasStages = true;
        params.items[0].physicalCount = null as unknown as number;
        expect(await executeInventoryFinalization(params)).toBe(false);
        expect(rpc).not.toHaveBeenCalled();
        expect(removeDraft).not.toHaveBeenCalled();
    });
});
