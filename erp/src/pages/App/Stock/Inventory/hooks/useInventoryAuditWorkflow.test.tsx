// @vitest-environment happy-dom
import 'fake-indexeddb/auto';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { catalog } = vi.hoisted(() => ({ catalog: { allProducts: [], suppliers: [], employees: [], getSupplierNames: () => 'Telasul' } }));
vi.mock('./useInventoryAuditData', () => ({ useInventoryAuditData: () => catalog }));
vi.mock('../services/offlineInventoryCatalog', () => ({
    ensureOfflineInventoryCatalogSynced: vi.fn().mockResolvedValue({ success: false, syncedAt: null }),
}));
vi.mock('@/pages/utils/inventoryService', () => ({ getNextInventoryCode: vi.fn().mockResolvedValue('000101') }));
vi.mock('@/pages/utils/supabaseConfig', () => ({ supabase: { rpc: vi.fn() } }));

import { useInventoryAuditWorkflow } from './useInventoryAuditWorkflow';
import { getNextInventoryCode } from '@/pages/utils/inventoryService';
import { deleteWebInventoryDraft, getWebInventoryDraft, listWebInventoryDrafts, saveWebInventoryDraft } from '../services/inventoryLocalDrafts';

afterEach(cleanup);
beforeEach(() => { vi.mocked(getNextInventoryCode).mockResolvedValue('000101'); });

const scope = {
    name: 'Inventário local', type: 'full', responsibleId: 'operator-1', hasStages: true,
    itemsSnapshot: [{ productId: 'p1', name: 'Produto', supplierNames: 'Telasul', assignedSupplier: 'Telasul', systemStock: 5, physicalCount: null, unit: 'UN', sku: 'SKU-1' }],
};

describe('fluxo local do inventário web', () => {
    it('persiste IndexedDB no ambiente do hook', async () => {
        await saveWebInventoryDraft({ id: 'probe', code: '1', date: '', name: '', responsibleId: '', hasStages: false, status: 'in_progress', items: [], updatedAt: '' });
        expect(await getWebInventoryDraft('probe')).not.toBeNull();
        await deleteWebInventoryDraft('probe');
    });
    it('serializa leituras concorrentes, persiste edição manual e restaura após remontar o hook', async () => {
        expect(await getNextInventoryCode()).toBe('000101');
        const onClose = vi.fn();
        const first = renderHook(() => useInventoryAuditWorkflow(true, onClose));
        await act(async () => { await first.result.current.handleConfirmScope(scope as any); });
        const auditId = first.result.current.draftRef.current.id!;
        expect(auditId).toMatch(/^[0-9a-f-]{36}$/);
        expect(first.result.current.draftRef.current.code).toBe('000101');
        expect(first.result.current.scopeConfig?.name).toBe('Inventário local');
        expect(first.result.current.view).toBe('operation');
        expect(first.result.current.items).toHaveLength(1);
        expect(await listWebInventoryDrafts()).toHaveLength(1);
        expect(await getWebInventoryDraft(auditId)).not.toBeNull();
        const itemId = first.result.current.items[0].id;
        await act(async () => {
            await Promise.all(Array.from({ length: 10 }, () => first.result.current.incrementScannedItem(itemId)));
        });
        expect((await getWebInventoryDraft(auditId))?.items[0].physicalCount).toBe(10);
        act(() => first.result.current.setItems(previous => previous.map(item => ({ ...item, physicalCount: 0 }))));
        await act(async () => { await first.result.current.saveDraft(true); });
        expect(onClose).toHaveBeenCalledOnce();
        expect((await getWebInventoryDraft(auditId))?.items[0].physicalCount).toBe(0);

        first.unmount();
        const local = await getWebInventoryDraft(auditId);
        const editingSession = {
            id: auditId, inventoryCode: local!.code, date: local!.date, status: 'in_progress' as const,
            items: local!.items, productsCount: 1, adjustmentsCount: 0, reversedCount: 0,
            hasStages: true,
        };
        const resumed = renderHook(() => useInventoryAuditWorkflow(true, vi.fn(), editingSession));
        await waitFor(() => expect(resumed.result.current.view).toBe('operation'));
        expect(resumed.result.current.items[0].physicalCount).toBe(0);
        await deleteWebInventoryDraft(auditId);
    });

    it('bloqueia leitura duplicada da mesma etiqueta após reabrir', async () => {
        const first = renderHook(() => useInventoryAuditWorkflow(true, vi.fn()));
        await act(async () => { await first.result.current.handleConfirmScope(scope as any); });
        const auditId = first.result.current.draftRef.current.id!;
        expect(await getWebInventoryDraft(auditId)).not.toBeNull();
        const itemId = first.result.current.items[0].id;
        await act(async () => { expect(await first.result.current.incrementScannedItem(itemId, 'label-1')).toBe(1); });
        first.unmount();
        const local = await getWebInventoryDraft(auditId);
        const resumed = renderHook(() => useInventoryAuditWorkflow(true, vi.fn(), {
            id: auditId, inventoryCode: local!.code, date: local!.date, status: 'in_progress',
            items: local!.items, productsCount: 1, adjustmentsCount: 0, reversedCount: 0,
        }));
        await waitFor(() => expect(resumed.result.current.view).toBe('operation'));
        expect(await resumed.result.current.incrementScannedItem(itemId, 'label-1')).toBeNull();
        expect((await getWebInventoryDraft(auditId))?.items[0].physicalCount).toBe(1);
        await deleteWebInventoryDraft(auditId);
    });
});
