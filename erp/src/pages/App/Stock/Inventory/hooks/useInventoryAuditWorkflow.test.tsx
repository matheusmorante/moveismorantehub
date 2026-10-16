// @vitest-environment happy-dom
import 'fake-indexeddb/auto';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { catalog, finalizeInventory } = vi.hoisted(() => ({
  catalog: {
    allProducts: [],
    suppliers: [],
    employees: [{ id: 'operator-1', fullName: 'Operador Teste' }],
    getSupplierNames: () => 'Telasul',
  },
  finalizeInventory: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('./useInventoryAuditData', () => ({ useInventoryAuditData: () => catalog }));
vi.mock('../services/offlineInventoryCatalog', () => ({
  ensureOfflineInventoryCatalogSynced: vi
    .fn()
    .mockResolvedValue({ success: false, syncedAt: null }),
}));
vi.mock('@/pages/utils/inventoryService', () => ({
  getNextInventoryCode: vi.fn().mockResolvedValue('000101'),
}));
vi.mock('@/pages/utils/supabaseConfig', () => ({ supabase: { rpc: vi.fn() } }));
vi.mock('../services/finalizeWebInventory', () => ({ finalizeWebInventory: finalizeInventory }));

import { useInventoryAuditWorkflow } from './useInventoryAuditWorkflow';
import { getNextInventoryCode } from '@/pages/utils/inventoryService';
import { ensureOfflineInventoryCatalogSynced } from '../services/offlineInventoryCatalog';
import { deleteInventorySubmission, freezeInventorySubmission, getInventorySubmission } from '../services/inventoryOutbox';
import * as draftStore from '../services/inventoryLocalDrafts';
import * as submissionStore from '../services/inventoryOutbox';
import {
  deleteWebInventoryDraft,
  getWebInventoryDraft,
  listWebInventoryDrafts,
  saveWebInventoryDraft,
} from '../services/inventoryLocalDrafts';

afterEach(async () => {
  cleanup(); vi.useRealTimers(); vi.restoreAllMocks();
  for (const draft of await listWebInventoryDrafts()) {
    await deleteInventorySubmission(draft.id); await deleteWebInventoryDraft(draft.id);
  }
});
beforeEach(() => {
  vi.clearAllMocks();
  catalog.employees = [{ id: 'operator-1', fullName: 'Operador Teste' }];
  vi.mocked(getNextInventoryCode).mockReset().mockResolvedValue('000101');
  vi.mocked(ensureOfflineInventoryCatalogSynced).mockReset().mockResolvedValue({ success: false, syncedAt: null });
  finalizeInventory.mockReset().mockResolvedValue(undefined);
});

const scope = {
  name: 'Inventário local',
  type: 'full',
  responsibleId: 'operator-1',
  hasStages: true,
  itemsSnapshot: [
    {
      productId: 'p1',
      variationId: 'v1',
      name: 'Produto',
      supplierNames: 'Telasul',
      assignedSupplier: 'Telasul',
      systemStock: 5,
      physicalCount: null,
      unit: 'UN',
      sku: 'SKU-1',
    },
  ],
};

describe('fluxo local do inventário web', () => {
  it('persiste IndexedDB no ambiente do hook', async () => {
    await saveWebInventoryDraft({
      id: 'probe',
      code: '1',
      date: '',
      name: '',
      responsibleId: '',
      hasStages: false,
      status: 'in_progress',
      items: [],
      updatedAt: '',
    });
    expect(await getWebInventoryDraft('probe')).not.toBeNull();
    await deleteWebInventoryDraft('probe');
  });
  it('serializa leituras concorrentes, persiste edição manual e restaura após remontar o hook', async () => {
    expect(await getNextInventoryCode()).toBe('000101');
    const onClose = vi.fn();
    const first = renderHook(() => useInventoryAuditWorkflow(true, onClose));
    await act(async () => {
      await first.result.current.handleConfirmScope(scope as any);
    });
    const auditId = first.result.current.draftRef.current.id!;
    expect(auditId).toMatch(/^[0-9a-f-]{36}$/);
    expect(first.result.current.draftRef.current.code).toBe('000101');
    expect(first.result.current.scopeConfig?.name).toBe('Inventário local');
    expect(first.result.current.scopeConfig?.responsibleName).toBe('Operador Teste');
    expect(first.result.current.view).toBe('operation');
    expect(first.result.current.items).toHaveLength(1);
    expect(await listWebInventoryDrafts()).toHaveLength(1);
    expect((await getWebInventoryDraft(auditId))?.responsibleName).toBe('Operador Teste');
    const itemId = first.result.current.items[0].id;
    await act(async () => {
      await Promise.all(
        Array.from({ length: 10 }, () => first.result.current.incrementScannedItem(itemId))
      );
    });
    expect((await getWebInventoryDraft(auditId))?.items[0].physicalCount).toBe(10);
    act(() =>
      first.result.current.setItems((previous) =>
        previous.map((item) => ({ ...item, physicalCount: 0 }))
      )
    );
    await act(async () => {
      await first.result.current.saveDraft(true);
    });
    expect(onClose).toHaveBeenCalledOnce();
    expect((await getWebInventoryDraft(auditId))?.items[0].physicalCount).toBe(0);

    first.unmount();
    const local = await getWebInventoryDraft(auditId);
    const editingSession = {
      id: auditId,
      inventoryCode: local!.code,
      date: local!.date,
      status: 'in_progress' as const,
      items: local!.items,
      productsCount: 1,
      adjustmentsCount: 0,
      reversedCount: 0,
      hasStages: true,
    };
    const resumed = renderHook(() => useInventoryAuditWorkflow(true, vi.fn(), editingSession));
    await waitFor(() => expect(resumed.result.current.view).toBe('operation'));
    expect(resumed.result.current.items[0].physicalCount).toBe(0);
    expect(resumed.result.current.scopeConfig?.responsibleName).toBe('Operador Teste');
    await deleteWebInventoryDraft(auditId);
  });

  it('bloqueia leitura duplicada da mesma etiqueta após reabrir', async () => {
    const first = renderHook(() => useInventoryAuditWorkflow(true, vi.fn()));
    await act(async () => {
      await first.result.current.handleConfirmScope(scope as any);
    });
    const auditId = first.result.current.draftRef.current.id!;
    expect(await getWebInventoryDraft(auditId)).not.toBeNull();
    const itemId = first.result.current.items[0].id;
    await act(async () => {
      expect(await first.result.current.incrementScannedItem(itemId, 'label-1')).toBe(1);
    });
    first.unmount();
    const local = await getWebInventoryDraft(auditId);
    const resumed = renderHook(() =>
      useInventoryAuditWorkflow(true, vi.fn(), {
        id: auditId,
        inventoryCode: local!.code,
        date: local!.date,
        status: 'in_progress',
        items: local!.items,
        productsCount: 1,
        adjustmentsCount: 0,
        reversedCount: 0,
      })
    );
    await waitFor(() => expect(resumed.result.current.view).toBe('operation'));
    expect(await resumed.result.current.incrementScannedItem(itemId, 'label-1')).toBeNull();
    expect((await getWebInventoryDraft(auditId))?.items[0].physicalCount).toBe(1);
    await deleteWebInventoryDraft(auditId);
  });

  it('finaliza com o nome salvo mesmo se o cadastro de funcionários falhar ao recarregar', async () => {
    const first = renderHook(() => useInventoryAuditWorkflow(true, vi.fn()));
    await act(async () => {
      await first.result.current.handleConfirmScope(scope as any);
    });
    const itemId = first.result.current.items[0].id;
    await act(async () => {
      await first.result.current.incrementScannedItem(itemId);
    });
    const auditId = first.result.current.draftRef.current.id!;
    catalog.employees = [];
    first.rerender();

    await act(async () => {
      await first.result.current.handleFinalize([
        { ...first.result.current.items[0], reconciledExpected: 5, difference: -4 },
      ]);
    });

    expect(finalizeInventory).toHaveBeenCalledOnce();
    expect(finalizeInventory.mock.calls[0][2].responsibleName).toBe('Operador Teste');
    await act(async () => { expect(await first.result.current.handleFinalize([{ ...first.result.current.items[0], reconciledExpected: 5, difference: -4 }])).toBe(false); });
    expect(finalizeInventory).toHaveBeenCalledOnce();
    await deleteWebInventoryDraft(auditId);
  });

  it('valida o escopo completo antes da sincronização ou criação de rascunho', async () => {
    const view = renderHook(() => useInventoryAuditWorkflow(true, vi.fn()));
    await act(async () => {
      expect(await view.result.current.handleConfirmScope({ ...scope, type: 'full', itemsSnapshot: [{ ...scope.itemsSnapshot[0], systemStock: Infinity }] })).toBe(false);
    });
    expect(ensureOfflineInventoryCatalogSynced).not.toHaveBeenCalled(); expect(getNextInventoryCode).not.toHaveBeenCalled();
    expect(view.result.current.operationError).not.toBe(''); expect(await listWebInventoryDrafts()).toEqual([]);
  });

  it('trava intenções concorrentes e não continua o início depois de fechar o proprietário', async () => {
    let finish!: () => void;
    vi.mocked(ensureOfflineInventoryCatalogSynced).mockReturnValueOnce(new Promise((resolve) => { finish = () => resolve({ success: false, syncedAt: null }); }));
    const view = renderHook(({ open }) => useInventoryAuditWorkflow(open, vi.fn()), { initialProps: { open: true } });
    let pending!: ReturnType<typeof view.result.current.handleConfirmScope>;
    act(() => { pending = view.result.current.handleConfirmScope({ ...scope, type: 'full' }); });
    await waitFor(() => expect(ensureOfflineInventoryCatalogSynced).toHaveBeenCalledOnce());
    await act(async () => { expect(await view.result.current.handleConfirmScope({ ...scope, type: 'full' })).toBe(false); expect(await view.result.current.saveDraft(true)).toBe(false); });
    view.rerender({ open: false });
    await act(async () => { finish(); expect(await pending).toBe(false); });
    expect(getNextInventoryCode).not.toHaveBeenCalled(); expect(await listWebInventoryDrafts()).toEqual([]);
    expect(view.result.current.isSaving).toBe(false);
  });

  it('limita consulta do código e mantém um identificador local único sem aguardar a resposta tardia', async () => {
    let finish!: () => void;
    vi.mocked(getNextInventoryCode).mockReturnValueOnce(new Promise((resolve) => { finish = () => resolve('LATE'); }));
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    const view = renderHook(() => useInventoryAuditWorkflow(true, vi.fn()));
    let pending!: ReturnType<typeof view.result.current.handleConfirmScope>;
    await act(async () => { pending = view.result.current.handleConfirmScope({ ...scope, type: 'full' }); });
    await act(async () => { await vi.advanceTimersByTimeAsync(10_000); });
    vi.useRealTimers();
    await act(async () => { expect(await pending).toBe(true); });
    const id = view.result.current.draftRef.current.id!;
    expect(view.result.current.draftRef.current.code).toBe(`LOCAL-${id.slice(0, 8)}`);
    await act(async () => { finish(); });
    expect(view.result.current.draftRef.current.code).toBe(`LOCAL-${id.slice(0, 8)}`);
    expect((await getWebInventoryDraft(id))?.code).toBe(`LOCAL-${id.slice(0, 8)}`);
  });

  it('preserva linha incompleta e contagem zero no rascunho, exigindo identidade e diferença coerente na conclusão', async () => {
    const close = vi.fn(); const view = renderHook(() => useInventoryAuditWorkflow(true, close));
    await act(async () => { await view.result.current.handleConfirmScope({ ...scope, type: 'full' }); });
    act(() => view.result.current.setItems((items) => [
      { ...items[0], physicalCount: 0 }, { ...items[0], id: 'blank', key: 'blank', productId: '', name: '', physicalCount: null },
    ]));
    await act(async () => { expect(await view.result.current.saveDraft(true)).toBe(true); });
    expect(close).toHaveBeenCalledOnce();
    const draft = await getWebInventoryDraft(view.result.current.draftRef.current.id!);
    expect(draft?.items.map((item) => [item.productId, item.physicalCount])).toEqual([['p1', 0], ['', null]]);
    act(() => view.result.current.setItems((items) => items.map((item) => item.id === 'blank' ? { ...item, physicalCount: 1 } : item)));
    await act(async () => { expect(await view.result.current.handleFinalize([{ ...view.result.current.items[0], reconciledExpected: 5, difference: -5 }])).toBe(false); });
    expect(finalizeInventory).not.toHaveBeenCalled();
    act(() => view.result.current.setItems((items) => [items[0]]));
    await act(async () => { expect(await view.result.current.handleFinalize([{ ...view.result.current.items[0], reconciledExpected: 5, difference: 999 }])).toBe(false); });
    expect(view.result.current.operationError).toContain('Revise os itens'); expect(finalizeInventory).not.toHaveBeenCalled();
    act(() => view.result.current.setItems((items) => [
      { ...items[0], physicalCount: 1 }, { ...items[0], id: 'blank', key: 'blank', productId: '', name: '', physicalCount: null },
    ]));
    expect(view.result.current.items[0].physicalCount).toBe(1);
    await act(async () => { expect(await view.result.current.handleFinalize([{ ...view.result.current.items[0], reconciledExpected: 5, difference: -4 }])).toBe(true); });
    expect(finalizeInventory).toHaveBeenCalledWith(expect.any(String), expect.any(String), expect.objectContaining({ items: expect.arrayContaining([expect.objectContaining({ productId: '', physicalCount: null })]) }),
      [expect.objectContaining({ productId: 'p1', variationId: 'v1', physicalCount: 1 })]);
  });

  it('congela a contagem durante a conclusão e depois de falha com submissão persistida', async () => {
    let reject!: () => void;
    finalizeInventory.mockImplementationOnce(async (auditId, code, observation) => {
      await freezeInventorySubmission({ contractVersion: 1, auditId, code, observation, items: [], responsibleName: 'Operador Teste' });
      await new Promise((_, fail) => { reject = () => fail(new Error('Sem rede')); });
    });
    const view = renderHook(() => useInventoryAuditWorkflow(true, vi.fn()));
    await act(async () => { await view.result.current.handleConfirmScope({ ...scope, type: 'full' }); });
    await act(async () => { await view.result.current.incrementScannedItem(view.result.current.items[0].id); });
    const adjustment = { ...view.result.current.items[0], reconciledExpected: 5, difference: -4 };
    let pending!: ReturnType<typeof view.result.current.handleFinalize>;
    act(() => { pending = view.result.current.handleFinalize([adjustment]); });
    await waitFor(() => expect(reject).toBeTypeOf('function'));
    await act(async () => { expect(await view.result.current.handleFinalize([adjustment])).toBe(false); expect(await view.result.current.saveDraft()).toBe(false); });
    act(() => view.result.current.setItems((items) => items.map((item) => ({ ...item, physicalCount: 8 }))));
    expect(view.result.current.items[0].physicalCount).toBe(1);
    await act(async () => { reject(); expect(await pending).toBe(false); });
    expect(view.result.current.operationError).toContain('Submissão salva'); expect(view.result.current.isSaving).toBe(false);
    expect(await getInventorySubmission(view.result.current.draftRef.current.id!)).not.toBeNull();
    act(() => view.result.current.setItems((items) => items.map((item) => ({ ...item, physicalCount: 9 }))));
    expect(view.result.current.items[0].physicalCount).toBe(1); expect(finalizeInventory).toHaveBeenCalledOnce();
  });

  it('libera progresso sem repetir uma conclusão incerta e não fecha outro proprietário com resposta tardia', async () => {
    let finish!: () => void;
    finalizeInventory.mockReturnValueOnce(new Promise((resolve) => { finish = () => resolve(undefined); }));
    const close = vi.fn(); const view = renderHook(({ open }) => useInventoryAuditWorkflow(open, close), { initialProps: { open: true } });
    await act(async () => { await view.result.current.handleConfirmScope({ ...scope, type: 'full' }); });
    await act(async () => { await view.result.current.incrementScannedItem(view.result.current.items[0].id); });
    const adjustment = { ...view.result.current.items[0], reconciledExpected: 5, difference: -4 };
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    let pending!: ReturnType<typeof view.result.current.handleFinalize>;
    await act(async () => { pending = view.result.current.handleFinalize([adjustment]); });
    await act(async () => { await vi.advanceTimersByTimeAsync(30_000); });
    vi.useRealTimers(); await act(async () => { expect(await pending).toBe(false); });
    expect(view.result.current.isSaving).toBe(false); expect(view.result.current.operationError).toContain('não foi confirmada');
    await act(async () => { expect(await view.result.current.handleFinalize([adjustment])).toBe(false); });
    expect(finalizeInventory).toHaveBeenCalledOnce();
    view.rerender({ open: false }); view.rerender({ open: true });
    await act(async () => { finish(); }); expect(close).not.toHaveBeenCalled();
  });

  it('ignora comandos e campos filhos capturados em uma abertura anterior', async () => {
    const close = vi.fn(); const view = renderHook(({ open }) => useInventoryAuditWorkflow(open, close), { initialProps: { open: true } });
    await act(async () => { await view.result.current.handleConfirmScope({ ...scope, type: 'full' }); });
    const old = view.result.current;
    view.rerender({ open: false }); view.rerender({ open: true });
    await act(async () => { await view.result.current.handleConfirmScope({ ...scope, type: 'full' }); });
    const id = view.result.current.draftRef.current.id!;
    act(() => old.setItems((items) => items.map((item) => ({ ...item, physicalCount: 99 }))));
    await act(async () => {
      expect(await old.incrementScannedItem(view.result.current.items[0].id)).toBeNull();
      expect(await old.saveDraft(true)).toBe(false);
      expect(await old.handleConfirmScope({ ...scope, type: 'full' })).toBe(false);
      expect(await old.handleFinalize([])).toBe(false);
    });
    expect(view.result.current.items[0].physicalCount).toBeNull();
    expect((await getWebInventoryDraft(id))?.items[0].physicalCount).toBeNull();
    expect(close).not.toHaveBeenCalled(); expect(finalizeInventory).not.toHaveBeenCalled();
  });

  it('bloqueia início até confirmar o rascunho e a submissão da sessão restaurada', async () => {
    const stored = { id: 'existing', code: 'OLD', date: new Date().toISOString(), name: 'Restaurado', responsibleId: 'operator-1', hasStages: false,
      status: 'in_progress' as const, items: [{ ...scope.itemsSnapshot[0], id: 'line', key: 'p1-v1', physicalCount: null }], updatedAt: new Date().toISOString() };
    await saveWebInventoryDraft(stored);
    let finish!: () => void;
    vi.spyOn(submissionStore, 'getInventorySubmission').mockReturnValueOnce(new Promise((resolve) => { finish = () => resolve(null); }));
    const session = { id: 'existing', inventoryCode: 'OLD', date: stored.date, status: 'in_progress' as const, items: stored.items, productsCount: 1, adjustmentsCount: 0, reversedCount: 0 };
    const view = renderHook(() => useInventoryAuditWorkflow(true, vi.fn(), session));
    await waitFor(() => expect(finish).toBeTypeOf('function'));
    expect(view.result.current.isRestoring).toBe(true); expect(view.result.current.isReady).toBe(false);
    await act(async () => { expect(await view.result.current.handleConfirmScope({ ...scope, type: 'full' })).toBe(false); });
    expect(ensureOfflineInventoryCatalogSynced).not.toHaveBeenCalled(); expect(getNextInventoryCode).not.toHaveBeenCalled();
    await act(async () => { finish(); });
    expect(view.result.current.isReady).toBe(true); expect(view.result.current.view).toBe('operation');
    expect(view.result.current.draftRef.current.id).toBe('existing'); expect(await listWebInventoryDrafts()).toHaveLength(1);
  });

  it('conserva a sessão bloqueada e informa falha quando não consegue conferir a outbox', async () => {
    const stored = { id: 'existing', code: 'OLD', date: new Date().toISOString(), name: '', responsibleId: 'operator-1', hasStages: false,
      status: 'in_progress' as const, items: [], updatedAt: new Date().toISOString() };
    await saveWebInventoryDraft(stored);
    vi.spyOn(submissionStore, 'getInventorySubmission').mockRejectedValueOnce(new Error('Falha ao conferir a submissão salva.'));
    const view = renderHook(() => useInventoryAuditWorkflow(true, vi.fn(), { id: 'existing', inventoryCode: 'OLD', date: stored.date, status: 'in_progress', items: [], productsCount: 0, adjustmentsCount: 0, reversedCount: 0 }));
    await waitFor(() => expect(view.result.current.isRestoring).toBe(false));
    expect(view.result.current.operationError).toContain('Falha ao conferir'); expect(view.result.current.isReady).toBe(false);
    await act(async () => { expect(await view.result.current.handleConfirmScope({ ...scope, type: 'full' })).toBe(false); });
    expect(ensureOfflineInventoryCatalogSynced).not.toHaveBeenCalled(); expect(await listWebInventoryDrafts()).toHaveLength(1);
  });

  it('ignora a leitura tardia da sessão depois de fechar e reabrir outro inventário', async () => {
    let finish!: () => void;
    vi.spyOn(draftStore, 'getWebInventoryDraft').mockReturnValueOnce(new Promise((resolve) => { finish = () => resolve(null); }));
    const session = { id: 'old', inventoryCode: 'OLD', date: new Date().toISOString(), status: 'in_progress' as const, items: [], productsCount: 0, adjustmentsCount: 0, reversedCount: 0 };
    const view = renderHook(({ old }) => useInventoryAuditWorkflow(true, vi.fn(), old ? session : null), { initialProps: { old: true } });
    expect(view.result.current.isRestoring).toBe(true); view.rerender({ old: false });
    await act(async () => { expect(await view.result.current.handleConfirmScope({ ...scope, type: 'full' })).toBe(true); });
    const id = view.result.current.draftRef.current.id!;
    await act(async () => { finish(); });
    expect(view.result.current.draftRef.current.id).toBe(id); expect(view.result.current.view).toBe('operation');
  });

  it('não continua gravações enfileiradas nem repete rascunho quando a gravação local fica incerta', async () => {
    const view = renderHook(() => useInventoryAuditWorkflow(true, vi.fn()));
    await act(async () => { await view.result.current.handleConfirmScope({ ...scope, type: 'full' }); });
    let finish!: () => void;
    const save = vi.spyOn(draftStore, 'saveWebInventoryDraft').mockReturnValueOnce(new Promise((resolve) => { finish = () => resolve(); }));
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    await act(async () => {
      view.result.current.setItems((items) => items.map((item) => ({ ...item, physicalCount: 1 })));
      view.result.current.setItems((items) => items.map((item) => ({ ...item, physicalCount: 2 })));
    });
    expect(save).toHaveBeenCalledOnce();
    await act(async () => { await vi.advanceTimersByTimeAsync(15_000); });
    vi.useRealTimers(); await act(async () => { await view.result.current.flushLocalWrites().catch(() => {}); });
    expect(view.result.current.operationError).toContain('Não foi possível confirmar');
    expect(save).toHaveBeenCalledOnce();
    act(() => view.result.current.setItems((items) => items.map((item) => ({ ...item, physicalCount: 3 }))));
    await act(async () => { expect(await view.result.current.saveDraft()).toBe(false); finish(); });
    expect(view.result.current.items[0].physicalCount).toBe(2); expect(save).toHaveBeenCalledOnce();
  });

  it('não omite uma linha contada nem repete uma identidade ao finalizar', async () => {
    const view = renderHook(() => useInventoryAuditWorkflow(true, vi.fn()));
    await act(async () => { await view.result.current.handleConfirmScope({ ...scope, type: 'full' }); });
    act(() => view.result.current.setItems((items) => [
      { ...items[0], physicalCount: 1 }, { ...items[0], id: 'second', key: 'second', productId: 'p2', physicalCount: 1 },
    ]));
    await act(async () => { expect(await view.result.current.handleFinalize([{ ...view.result.current.items[0], reconciledExpected: 5, difference: -4 }])).toBe(false); });
    expect(view.result.current.operationError).toContain('todos os itens contados'); expect(finalizeInventory).not.toHaveBeenCalled();
  });
});
