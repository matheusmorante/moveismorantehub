import { useState, useEffect, useRef, useCallback } from 'react';
import { getNextInventoryCode } from '@/pages/utils/inventoryService';
import { toast } from 'react-toastify';
import type {
  AuditItem,
  InventoryAuditSession,
} from '../types/inventoryAudit.types';
import type { ScopeConfiguration } from '../types/inventoryScope.types';
import { getEmployeeDisplayName } from '../utils/employeeDisplayName';
import { useInventoryAuditData } from './useInventoryAuditData';
import { getWebInventoryDraft, saveWebInventoryDraft } from '../services/inventoryLocalDrafts';
import { finalizeWebInventory } from '../services/finalizeWebInventory';
import { getInventorySubmission } from '../services/inventoryOutbox';
import { ensureOfflineInventoryCatalogSynced } from '../services/offlineInventoryCatalog';
import { flattenFormErrors, useZodForm } from '@/hooks/useZodForm';
import { withTimeout } from '../../../../../../../shared-utils/withTimeout';
import {
  inventoryAuditCompletionSchema,
  inventoryAuditDraftSchema,
  inventoryAuditScopeSchema,
} from '../../../../../../../shared-utils/inventoryAuditFormSchemas';

const rejectInvalidSnapshot = (errors: Parameters<typeof flattenFormErrors>[0]) => {
  throw new Error(Object.values(flattenFormErrors(errors))[0] || 'Confira os dados do inventário.');
};

export const useInventoryAuditWorkflow = (
  isOpen: boolean,
  onClose: () => void,
  editingSession?: InventoryAuditSession | null
) => {
  const { allProducts, suppliers, employees, getSupplierNames, catalogSyncedAt } =
    useInventoryAuditData(isOpen);

  // View state
  const [view, setView] = useState<'scope' | 'operation' | 'review'>('scope');

  // Operation State
  const [items, setItemsState] = useState<AuditItem[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [operationError, setOperationError] = useState('');
  const [isRestoring, setIsRestoring] = useState(true);
  const [scopeConfig, setScopeConfig] = useState<{
    name: string;
    responsibleId: string;
    responsibleName?: string;
    hasStages?: boolean;
    scopeType?: string;
    supplierId?: string;
  } | null>(null);

  const draftRef = useRef<{ id?: string; code?: string; markerMoveId?: string; date?: string }>({});
  const latestItemsRef = useRef<AuditItem[]>([]);
  const frozenSubmissionRef = useRef(false);
  const scannedLabelsRef = useRef<Set<string>>(new Set());
  const scopeConfigRef = useRef(scopeConfig);
  const writeQueueRef = useRef<Promise<void>>(Promise.resolve());
  const writeErrorRef = useRef<unknown>(null);
  const initializedSessionRef = useRef<string | null>(null);
  const ownerKey = JSON.stringify([isOpen, editingSession?.id || 'new']);
  const owner = useRef({ key: ownerKey, open: isOpen, draftUncertain: false, finalized: false });
  if (owner.current.key !== ownerKey) owner.current = { key: ownerKey, open: isOpen, draftUncertain: false, finalized: false };
  const renderOwner = owner.current;
  const readyOwner = useRef<typeof owner.current | null>(null);
  const restoreInputs = useRef({ editingSession, allProducts, getSupplierNames });
  restoreInputs.current = { editingSession, allProducts, getSupplierNames };
  const mounted = useRef(false);
  const operation = useRef<typeof owner.current | null>(null);
  const uncertainCompletion = useRef<typeof owner.current | null>(null);
  const isCurrent = (captured: typeof owner.current) => mounted.current && captured.open && captured === owner.current;
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  useEffect(() => { setIsSaving(false); setOperationError(''); }, [ownerKey]);
  const beginOperation = () => {
    if (!isCurrent(renderOwner) || readyOwner.current !== renderOwner || renderOwner.draftUncertain || operation.current === owner.current) return null;
    operation.current = owner.current; setIsSaving(true); setOperationError(''); return owner.current;
  };
  const finishOperation = (captured: typeof owner.current) => {
    if (operation.current !== captured) return;
    operation.current = null;
    if (isCurrent(captured)) setIsSaving(false);
  };
  const { validateAndRun: validateDraft } = useZodForm(inventoryAuditDraftSchema, {
    id: '', code: '', date: '', name: '', responsibleId: '', hasStages: false,
    status: 'in_progress', items: [], updatedAt: '',
  });
  const { validateAndRun: validateScope } = useZodForm(inventoryAuditScopeSchema, {
    type: 'full', name: '', supplierId: '', responsibleId: '', itemsSnapshot: [],
  });
  const { validateAndRun: validateCompletion } = useZodForm(inventoryAuditCompletionSchema, {
    id: '', code: '', items: [], adjustments: [],
  });

  const createItemId = () => crypto.randomUUID();

  const getDraftSnapshot = useCallback((nextItems: AuditItem[]) => {
    const draft = draftRef.current;
    const scope = scopeConfigRef.current;
    if (!draft.id || !draft.code || !scope) return;
    return {
      id: draft.id,
      code: draft.code,
      date: draft.date || new Date().toISOString(),
      name: scope.name,
      responsibleId: scope.responsibleId,
      responsibleName: scope.responsibleName,
      hasStages: Boolean(scope.hasStages),
      scopeType: scope.scopeType,
      supplierId: scope.supplierId,
      status: 'in_progress' as const,
      items: nextItems.map((item) => ({ ...item })),
      scannedLabelIds: [...scannedLabelsRef.current],
      updatedAt: new Date().toISOString(),
    };
  }, []);

  const persistItems = useCallback((nextItems: AuditItem[]) => {
    const snapshot = getDraftSnapshot(nextItems);
    if (!snapshot) return;
    const captured = owner.current;
    const write = writeQueueRef.current.then(async () => {
      const result = await validateDraft(snapshot, async (values) => {
        if (captured.draftUncertain) throw new Error('A gravação anterior do rascunho não foi confirmada.');
        const confirmed = await withTimeout(saveWebInventoryDraft(values).then(() => true), 15_000, false, 'inventario:rascunho');
        if (!confirmed) { captured.draftUncertain = true; throw new Error('Não foi possível confirmar o rascunho neste navegador.'); }
        return true;
      }, rejectInvalidSnapshot);
      if (!result) throw new Error('Não foi possível validar a contagem local.');
    });
    writeQueueRef.current = write.then(
      () => {
        if (captured === owner.current) writeErrorRef.current = null;
      },
      (error) => {
        if (captured !== owner.current || !mounted.current) return;
        writeErrorRef.current = error;
        setOperationError('Não foi possível confirmar a contagem neste navegador. Confira o rascunho antes de sair.');
        toast.error('Não foi possível salvar a contagem neste navegador.');
      }
    );
  }, [getDraftSnapshot, validateDraft]);

  const setItems: React.Dispatch<React.SetStateAction<AuditItem[]>> = useCallback(
    (nextValue) => {
      if (!mounted.current || !renderOwner.open || renderOwner !== owner.current || readyOwner.current !== renderOwner) return;
      if (renderOwner.draftUncertain) { toast.error('A gravação anterior não foi confirmada. Confira o rascunho e reabra o inventário.'); return; }
      if (operation.current === owner.current) return;
      if (frozenSubmissionRef.current) {
        toast.error('Esta conclusão já foi salva. Retome o envio sem alterar a contagem.');
        return;
      }
      const next = typeof nextValue === 'function' ? nextValue(latestItemsRef.current) : nextValue;
      latestItemsRef.current = next;
      setItemsState(next);
      persistItems(next);
    },
    [persistItems, renderOwner]
  );

  const flushLocalWrites = useCallback(async () => {
    const completed = await withTimeout(writeQueueRef.current.then(() => true), 20_000, false, 'inventario:fila');
    if (!completed) throw new Error('A gravação local ainda não foi confirmada.');
    if (writeErrorRef.current) throw writeErrorRef.current;
  }, []);

  // Initialization
  useEffect(() => {
    if (!isOpen) {
      initializedSessionRef.current = null;
      readyOwner.current = null; setIsRestoring(false);
      return;
    }
    const sessionKey = editingSession?.id || 'new';
    if (initializedSessionRef.current === sessionKey) return;
    let cancelled = false;
    readyOwner.current = null; setIsRestoring(true);
    writeErrorRef.current = null;
    const restore = async () => {
      const { editingSession, allProducts, getSupplierNames } = restoreInputs.current;
      if (editingSession) {
        const restored = await withTimeout(getWebInventoryDraft(editingSession.id).then((draft) => ({ draft })), 15_000, null, 'inventario:restaurar');
        if (cancelled) return;
        if (!restored) throw new Error('Não foi possível consultar o rascunho salvo.');
        const local = restored.draft;
        if (local) {
          const submission = await withTimeout(getInventorySubmission(local.id).then((pending) => ({ pending })), 15_000, null, 'inventario:submissao-salva');
          if (cancelled) return;
          if (!submission) throw new Error('Não foi possível conferir a submissão salva.');
          frozenSubmissionRef.current = Boolean(submission.pending);
          draftRef.current = {
            id: local.id,
            code: local.code,
            date: local.date,
            markerMoveId: editingSession.markerMoveId,
          };
          scannedLabelsRef.current = new Set(local.scannedLabelIds || []);
          latestItemsRef.current = local.items;
          setItemsState(local.items);
          const config = {
            name: local.name,
            hasStages: local.hasStages,
            responsibleId: local.responsibleId,
            responsibleName: local.responsibleName,
            scopeType: local.scopeType,
            supplierId: local.supplierId,
          };
          scopeConfigRef.current = config;
          setScopeConfig(config);
          setView('operation');
          initializedSessionRef.current = sessionKey;
          readyOwner.current = renderOwner; setIsRestoring(false);
          return;
        }
        const restoredItems = editingSession.items.map((source) => {
          const product = allProducts.find((item) => String(item.id) === String(source.productId));
          return {
            id: createItemId(),
            key: `${source.productId}-${source.variationId || 'main'}`,
            productId: source.productId,
            variationId: source.variationId,
            name: source.name,
            supplierNames: product ? getSupplierNames(product) : 'Fábrica não informada',
            assignedSupplier: source.assignedSupplier || 'Sem fornecedor',
            systemStock: source.systemStock,
            physicalCount: source.physicalCount,
            unit: product?.unit || 'UN',
            countedAt: (source as AuditItem).countedAt,
            sku: source.sku || product?.sku || product?.code || '',
            code: source.code || product?.code || '',
            barcode: source.barcode || product?.barcode || '',
          } as AuditItem;
        });
        draftRef.current = {
          id: editingSession.id,
          code: editingSession.inventoryCode,
          markerMoveId: editingSession.markerMoveId,
          date: editingSession.date,
        };
        scannedLabelsRef.current.clear();
        const config = {
          name: editingSession.inventoryCode,
          hasStages: editingSession.hasStages ?? false,
          responsibleId: editingSession.responsibleId || '',
          responsibleName: editingSession.responsibleName,
        };
        scopeConfigRef.current = config;
        setScopeConfig(config);
        latestItemsRef.current = restoredItems;
        setItemsState(restoredItems);
        persistItems(restoredItems);
        setView('operation');
      } else {
        frozenSubmissionRef.current = false;
        latestItemsRef.current = [];
        setItemsState([]);
        scopeConfigRef.current = null;
        setScopeConfig(null);
        draftRef.current = {};
        scannedLabelsRef.current.clear();
        setView('scope');
      }
      initializedSessionRef.current = sessionKey;
      readyOwner.current = renderOwner; setIsRestoring(false);
    };
    void restore().catch((error) => {
      if (cancelled) return;
      setOperationError(error instanceof Error ? error.message : 'Não foi possível recuperar a contagem salva neste navegador.');
      setIsRestoring(false);
      toast.error('Não foi possível recuperar a contagem salva neste navegador.');
    });
    return () => {
      cancelled = true;
    };
  }, [isOpen, ownerKey, renderOwner, editingSession?.id, persistItems]);

  const handleConfirmScope = async (nextConfig: ScopeConfiguration) => {
    const captured = beginOperation();
    if (!captured) return false;
    try {
      return await validateScope({
    ...nextConfig, supplierId: nextConfig.supplierId ?? '', itemsSnapshot: nextConfig.itemsSnapshot.map((item) => ({ ...item })),
  }, async (config) => {
    if (!isCurrent(captured)) return false;
    frozenSubmissionRef.current = false;
    await withTimeout(ensureOfflineInventoryCatalogSynced(), 15_000, null, 'inventario:catalogo');
    if (!isCurrent(captured)) return false;
    const initialItems = config.itemsSnapshot.map((snapshot) => ({
      id: createItemId(),
      key: `${snapshot.productId}-${snapshot.variationId || 'main'}`,
      productId: snapshot.productId,
      variationId: snapshot.variationId,
      name: snapshot.name,
      supplierNames: snapshot.supplierNames,
      assignedSupplier: snapshot.assignedSupplier,
      systemStock: snapshot.systemStock,
      physicalCount: null, // Start as null (uncounted)
      unit: snapshot.unit,
      sku: snapshot.sku,
      code: snapshot.code,
      barcode: snapshot.barcode,
      isActive: snapshot.isActive,
    }));

    const responsible = employees.find((employee) => String(employee.id) === config.responsibleId);
    const nextScope = {
      name: config.name,
      hasStages: config.hasStages,
      scopeType: config.type,
      supplierId: config.supplierId,
      responsibleId: config.responsibleId,
      responsibleName: responsible ? getEmployeeDisplayName(responsible) : undefined,
    };
    const auditId = draftRef.current.id || crypto.randomUUID();
    let code = draftRef.current.code || '';
    try {
      if (!code) code = await withTimeout(getNextInventoryCode(), 10_000, '', 'inventario:codigo');
    } catch {
      code = `LOCAL-${auditId.slice(0, 8)}`;
    }
    if (!isCurrent(captured)) return false;
    if (!code) code = `LOCAL-${auditId.slice(0, 8)}`;
    draftRef.current = { id: auditId, code, date: new Date().toISOString() };
    scannedLabelsRef.current.clear();
    scopeConfigRef.current = nextScope;
    setScopeConfig(nextScope);
    latestItemsRef.current = initialItems;
    setItemsState(initialItems);
    persistItems(initialItems);
    await flushLocalWrites();
    if (!isCurrent(captured)) return false;
    setView('operation'); return true;
  }, (errors) => {
    if (!isCurrent(captured)) return;
    const message = Object.values(flattenFormErrors(errors))[0] || 'Confira o escopo do inventário.';
    setOperationError(message); toast.error(message);
  });
    } catch {
      if (isCurrent(captured)) {
        setOperationError('Não foi possível iniciar o inventário: armazenamento local indisponível.');
        toast.error('Não foi possível iniciar o inventário: armazenamento local indisponível.');
      }
      return false;
    } finally { finishOperation(captured); }
  };

  const saveDraft = async (closeAfterSave = false) => {
      const captured = beginOperation();
      if (!captured) return false;
      try {
        await flushLocalWrites();
        if (!isCurrent(captured)) return false;
        const snapshot = getDraftSnapshot(latestItemsRef.current);
        if (!snapshot) throw new Error('Rascunho não identificado.');
        return await validateDraft(snapshot, () => {
          if (!isCurrent(captured)) return false;
          if (closeAfterSave) onClose();
          return true;
        }, rejectInvalidSnapshot);
      } catch {
        if (!isCurrent(captured)) return false;
        setOperationError('Não foi possível salvar o rascunho do inventário.');
        toast.error('Não foi possível salvar o rascunho do inventário.');
        return false;
      } finally { finishOperation(captured); }
  };

  const incrementScannedItem = async (itemId: string, labelId?: string): Promise<number | null> => {
    if (!isCurrent(renderOwner) || readyOwner.current !== renderOwner || renderOwner.draftUncertain) return null;
    if (operation.current === owner.current) return null;
    const captured = owner.current;
    if (frozenSubmissionRef.current) {
      toast.error('Esta conclusão já foi salva. Retome o envio sem alterar a contagem.');
      return null;
    }
    if (labelId && scannedLabelsRef.current.has(labelId)) return null;
    const current = latestItemsRef.current.find((item) => item.id === itemId);
    if (!current) throw new Error('Produto não encontrado no inventário local.');
    const count = (current.physicalCount ?? 0) + 1;
    if (labelId) scannedLabelsRef.current.add(labelId);
    setItems((previous) =>
      previous.map((item) =>
        item.id === itemId
          ? { ...item, physicalCount: count, countedAt: new Date().toISOString() }
          : item
      )
    );
    await flushLocalWrites();
    return isCurrent(captured) ? count : null;
  };

  const handleFinalize = async (
    itemsWithAdjustment: Array<AuditItem & { reconciledExpected: number; difference: number }>
  ) => {
    if (!isCurrent(renderOwner) || readyOwner.current !== renderOwner || renderOwner.finalized) return false;
    if (!scopeConfig || uncertainCompletion.current === owner.current) {
      setOperationError('Confira a submissão salva e reabra o inventário antes de tentar concluir.'); return false;
    }
    const captured = beginOperation();
    if (!captured) return false;
    const previouslyFrozen = frozenSubmissionRef.current;
    frozenSubmissionRef.current = true;
    let attempted = false, timedOut = false, succeeded = false;
    try {
      await flushLocalWrites();
      if (!isCurrent(captured)) return false;
      return await validateCompletion({
        id: draftRef.current.id || '', code: draftRef.current.code || '',
        items: latestItemsRef.current.map((item) => ({ ...item })),
        adjustments: itemsWithAdjustment.map((item) => ({ ...item, physicalCount: item.physicalCount! })),
      }, async (values) => {
      if (!isCurrent(captured)) return false;
      const auditId = values.id;
      const code = values.code;
      const responsible = employees.find(
        (employee) => String(employee.id) === scopeConfig.responsibleId
      );
      const auditObservation = {
        inventoryAudit: true,
        inventoryCode: code,
        status: 'completed',
        name: scopeConfig.name,
        hasStages: scopeConfig.hasStages,
        responsibleId: scopeConfig.responsibleId,
        scopeType: scopeConfig.scopeType,
        supplierId: scopeConfig.supplierId,
        responsibleName: responsible
          ? getEmployeeDisplayName(responsible)
          : scopeConfig.responsibleName || editingSession?.responsibleName || '',
        items: values.items.map(
          ({
            productId,
            variationId,
            name,
            systemStock,
            physicalCount,
            assignedSupplier,
            countedAt,
          }) => ({
            productId,
            variationId,
            name,
            systemStock,
            physicalCount,
            assignedSupplier,
            countedAt,
          })
        ),
      };
      attempted = true;
      const confirmed = await withTimeout(finalizeWebInventory(auditId, code, auditObservation, values.adjustments).then(() => true),
        30_000, false, 'inventario:concluir');
      if (!isCurrent(captured)) return false;
      if (!confirmed) { timedOut = true; throw new Error('Conclusão sem confirmação.'); }
      succeeded = true;
      captured.finalized = true;

      toast.success(
        `Inventário #${code} finalizado! ${values.items.length} produto(s) contados e ${values.adjustments.length} ajuste(s) lançados no estoque. ✨`
      );
      onClose();
      return true;
      }, (errors) => {
        if (!isCurrent(captured)) return;
        const message = Object.values(flattenFormErrors(errors))[0] || 'Confira as contagens do inventário.';
        setOperationError(message); toast.error(message);
      });
    } catch {
      if (!isCurrent(captured)) return false;
      const lookup = attempted && draftRef.current.id ? await withTimeout(getInventorySubmission(draftRef.current.id)
        .then((pending) => ({ pending })).catch(() => null), 5_000, null, 'inventario:conferir-submissao') : { pending: null };
      if (!isCurrent(captured)) return false;
      frozenSubmissionRef.current = previouslyFrozen || timedOut || !lookup || Boolean(lookup.pending);
      if (timedOut || !lookup) uncertainCompletion.current = captured;
      const message = timedOut || !lookup ? 'A conclusão não foi confirmada. Confira a submissão salva e reabra o inventário antes de repetir.'
        : lookup.pending
          ? 'Submissão salva neste navegador. Retome o inventário para tentar enviar novamente.'
          : 'Erro ao processar as movimentações de inventário.';
      setOperationError(message); toast.error(message); return false;
    } finally {
      if (isCurrent(captured) && !attempted && !succeeded) frozenSubmissionRef.current = previouslyFrozen;
      finishOperation(captured);
    }
  };

  const hasChanges = items.some((i) => i.physicalCount !== null);

  return {
    allProducts,
    suppliers,
    employees,
    catalogSyncedAt,
    view,
    setView,
    items,
    setItems,
    scopeConfig,
    draftRef,
    isSaving,
    operationError,
    isRestoring,
    isReady: readyOwner.current === renderOwner,
    hasChanges,
    handleConfirmScope,
    handleFinalize,
    saveDraft,
    flushLocalWrites,
    incrementScannedItem,
  };
};
