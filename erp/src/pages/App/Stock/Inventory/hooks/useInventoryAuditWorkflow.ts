import { useState, useEffect, useRef, useCallback } from 'react';
import { getNextInventoryCode } from '@/pages/utils/inventoryService';
import { toast } from 'react-toastify';
import type {
  AuditItem,
  InventoryAuditSession,
  InventorySnapshotItem,
} from '../types/inventoryAudit.types';
import type { ScopeConfiguration } from '../types/inventoryScope.types';
import { getEmployeeDisplayName } from '../utils/employeeDisplayName';
import { useInventoryAuditData } from './useInventoryAuditData';
import { getWebInventoryDraft, saveWebInventoryDraft } from '../services/inventoryLocalDrafts';
import { finalizeWebInventory } from '../services/finalizeWebInventory';
import { getInventorySubmission } from '../services/inventoryOutbox';
import { ensureOfflineInventoryCatalogSynced } from '../services/offlineInventoryCatalog';
import { flattenFormErrors, useZodForm } from '@/hooks/useZodForm';
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
  editingSession?: InventoryAuditSession | null,
  copiedItems?: readonly InventorySnapshotItem[] | null
) => {
  const { allProducts, suppliers, employees, getSupplierNames, catalogSyncedAt } =
    useInventoryAuditData(isOpen);

  // View state
  const [view, setView] = useState<'scope' | 'operation' | 'review'>('scope');

  // Operation State
  const [items, setItemsState] = useState<AuditItem[]>([]);
  const [isSaving, setIsSaving] = useState(false);
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
      items: nextItems,
      scannedLabelIds: [...scannedLabelsRef.current],
      updatedAt: new Date().toISOString(),
    };
  }, []);

  const persistItems = useCallback((nextItems: AuditItem[]) => {
    const snapshot = getDraftSnapshot(nextItems);
    if (!snapshot) return;
    const write = writeQueueRef.current.then(async () => {
      const result = await validateDraft(snapshot, async (values) => {
        await saveWebInventoryDraft(values);
        return true;
      }, rejectInvalidSnapshot);
      if (!result) throw new Error('Não foi possível validar a contagem local.');
    });
    writeQueueRef.current = write.then(
      () => {
        writeErrorRef.current = null;
      },
      (error) => {
        writeErrorRef.current = error;
        console.error('Falha ao salvar contagem local:', error);
        toast.error('Não foi possível salvar a contagem neste navegador.');
      }
    );
  }, [getDraftSnapshot, validateDraft]);

  const setItems: React.Dispatch<React.SetStateAction<AuditItem[]>> = useCallback(
    (nextValue) => {
      if (frozenSubmissionRef.current) {
        toast.error('Esta conclusão já foi salva. Retome o envio sem alterar a contagem.');
        return;
      }
      const next = typeof nextValue === 'function' ? nextValue(latestItemsRef.current) : nextValue;
      latestItemsRef.current = next;
      setItemsState(next);
      persistItems(next);
    },
    [persistItems]
  );

  const flushLocalWrites = useCallback(async () => {
    await writeQueueRef.current;
    if (writeErrorRef.current) throw writeErrorRef.current;
  }, []);

  // Initialization
  useEffect(() => {
    if (!isOpen) {
      initializedSessionRef.current = null;
      return;
    }
    const sessionKey = editingSession?.id || 'new';
    if (initializedSessionRef.current === sessionKey) return;
    let cancelled = false;
    const restore = async () => {
      if (editingSession) {
        const local = await getWebInventoryDraft(editingSession.id);
        if (cancelled) return;
        if (local) {
          frozenSubmissionRef.current = Boolean(await getInventorySubmission(local.id));
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
          return;
        }
        if (!allProducts.length || !suppliers.length) return;
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
    };
    void restore().catch((error) => {
      console.error('Falha ao restaurar inventário local:', error);
      toast.error('Não foi possível recuperar a contagem salva neste navegador.');
    });
    return () => {
      cancelled = true;
    };
  }, [isOpen, editingSession, allProducts, suppliers, copiedItems, getSupplierNames, persistItems]);

  const handleConfirmScope = (nextConfig: ScopeConfiguration) => validateScope({
    ...nextConfig, supplierId: nextConfig.supplierId ?? '',
  }, async (config) => {
    frozenSubmissionRef.current = false;
    await ensureOfflineInventoryCatalogSynced();
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
    const auditId = crypto.randomUUID();
    let code: string;
    try {
      code = await getNextInventoryCode();
    } catch {
      code = `LOCAL-${auditId.slice(0, 8)}`;
    }
    if (!code) code = `LOCAL-${auditId.slice(0, 8)}`;
    draftRef.current = { id: auditId, code, date: new Date().toISOString() };
    scannedLabelsRef.current.clear();
    scopeConfigRef.current = nextScope;
    setScopeConfig(nextScope);
    latestItemsRef.current = initialItems;
    setItemsState(initialItems);
    persistItems(initialItems);
    try {
      await flushLocalWrites();
      setView('operation');
    } catch {
      toast.error('Não foi possível iniciar o inventário: armazenamento local indisponível.');
    }
  }, (errors) => toast.error(Object.values(flattenFormErrors(errors))[0] || 'Confira o escopo do inventário.'));

  const saveDraft = useCallback(
    async (closeAfterSave = false) => {
      setIsSaving(true);
      try {
        await flushLocalWrites();
        const snapshot = getDraftSnapshot(latestItemsRef.current);
        if (snapshot && !await validateDraft(snapshot, () => true, rejectInvalidSnapshot)) return false;
        if (closeAfterSave) onClose();
        return true;
      } catch (error: unknown) {
        console.error('Erro ao salvar rascunho da contagem:', error);
        toast.error('Não foi possível salvar o rascunho do inventário.');
        return false;
      } finally {
        setIsSaving(false);
      }
    },
    [flushLocalWrites, getDraftSnapshot, onClose, validateDraft]
  );

  const incrementScannedItem = async (itemId: string, labelId?: string): Promise<number | null> => {
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
    return count;
  };

  const handleFinalize = async (
    itemsWithAdjustment: Array<AuditItem & { reconciledExpected: number; difference: number }>
  ) => {
    if (!scopeConfig) return;

    setIsSaving(true);
    try {
      await flushLocalWrites();
      await validateCompletion({
        id: draftRef.current.id || '', code: draftRef.current.code || '',
        items: latestItemsRef.current, adjustments: itemsWithAdjustment,
      }, async (values) => {
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
      await finalizeWebInventory(auditId, code, auditObservation, values.adjustments);

      toast.success(
        `Inventário #${code} finalizado! ${values.items.length} produto(s) contados e ${values.adjustments.length} ajuste(s) lançados no estoque. ✨`
      );
      onClose();
      }, (errors) => toast.error(Object.values(flattenFormErrors(errors))[0] || 'Confira as contagens do inventário.'));
    } catch (error: unknown) {
      console.error('Erro ao salvar inventário:', error);
      const pending =
        draftRef.current.id &&
        (await getInventorySubmission(draftRef.current.id).catch(() => null));
      toast.error(
        pending
          ? 'Submissão salva neste navegador. Retome o inventário para tentar enviar novamente.'
          : 'Erro ao processar as movimentações de inventário.'
      );
    } finally {
      setIsSaving(false);
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
    hasChanges,
    handleConfirmScope,
    handleFinalize,
    saveDraft,
    flushLocalWrites,
    incrementScannedItem,
  };
};
