import { useState, useEffect, useRef, useCallback } from "react";
import { getNextInventoryCode } from '@/pages/utils/inventoryService';
import { toast } from "react-toastify";
import type { InventorySnapshotItem, InventoryAuditSession } from "../types/inventoryAudit.types";
import type { ScopeConfiguration } from "../modals/InventoryScopeModal";
import type { AuditItem } from "../modals/InventoryAuditModal";
import { getEmployeeDisplayName } from "../components/InventoryResponsibleSelect";
import { useInventoryAuditData } from "./useInventoryAuditData";
import { getWebInventoryDraft, saveWebInventoryDraft } from '../services/inventoryLocalDrafts';
import { finalizeWebInventory } from '../services/finalizeWebInventory';
import { ensureOfflineInventoryCatalogSynced } from '../services/offlineInventoryCatalog';

export const useInventoryAuditWorkflow = (
    isOpen: boolean,
    onClose: () => void,
    editingSession?: InventoryAuditSession | null,
    copiedItems?: readonly InventorySnapshotItem[] | null,
) => {
    const { allProducts, suppliers, employees, getSupplierNames } = useInventoryAuditData(isOpen);
    
    // View state
    const [view, setView] = useState<'scope' | 'operation' | 'review'>('scope');

    // Operation State
    const [items, setItemsState] = useState<AuditItem[]>([]);
    const [isSaving, setIsSaving] = useState(false);
    const [scopeConfig, setScopeConfig] = useState<{ name: string, responsibleId: string, hasStages?: boolean, scopeType?: string } | null>(null);
    
    const draftRef = useRef<{ id?: string; code?: string; markerMoveId?: string; date?: string }>({});
    const latestItemsRef = useRef<AuditItem[]>([]);
    const scannedLabelsRef = useRef<Set<string>>(new Set());
    const scopeConfigRef = useRef(scopeConfig);
    const writeQueueRef = useRef<Promise<void>>(Promise.resolve());
    const writeErrorRef = useRef<unknown>(null);
    const initializedSessionRef = useRef<string | null>(null);

    const createItemId = () => crypto.randomUUID();

    const persistItems = useCallback((nextItems: AuditItem[]) => {
        const draft = draftRef.current;
        const scope = scopeConfigRef.current;
        if (!draft.id || !draft.code || !scope) return;
        const snapshot = {
            id: draft.id,
            code: draft.code,
            date: draft.date || new Date().toISOString(),
            name: scope.name,
            responsibleId: scope.responsibleId,
            hasStages: Boolean(scope.hasStages),
            scopeType: scope.scopeType,
            status: 'in_progress' as const,
            items: nextItems,
            scannedLabelIds: [...scannedLabelsRef.current],
            updatedAt: new Date().toISOString(),
        };
        const write = writeQueueRef.current.then(() => saveWebInventoryDraft(snapshot));
        writeQueueRef.current = write.then(() => { writeErrorRef.current = null; }, error => {
            writeErrorRef.current = error;
            console.error('Falha ao salvar contagem local:', error);
            toast.error('Não foi possível salvar a contagem neste navegador.');
        });
    }, []);

    const setItems: React.Dispatch<React.SetStateAction<AuditItem[]>> = useCallback(nextValue => {
        const next = typeof nextValue === 'function' ? nextValue(latestItemsRef.current) : nextValue;
        latestItemsRef.current = next;
        setItemsState(next);
        persistItems(next);
    }, [persistItems]);

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
                    draftRef.current = { id: local.id, code: local.code, date: local.date, markerMoveId: editingSession.markerMoveId };
                    scannedLabelsRef.current = new Set(local.scannedLabelIds || []);
                    latestItemsRef.current = local.items;
                    setItemsState(local.items);
                    const config = { name: local.name, hasStages: local.hasStages, responsibleId: local.responsibleId, scopeType: local.scopeType };
                    scopeConfigRef.current = config;
                    setScopeConfig(config);
                    setView('operation');
                    initializedSessionRef.current = sessionKey;
                    return;
                }
                if (!allProducts.length || !suppliers.length) return;
                const restoredItems = editingSession.items.map(source => {
                    const product = allProducts.find(item => String(item.id) === String(source.productId));
                    return {
                        id: createItemId(), key: `${source.productId}-${source.variationId || 'main'}`,
                        productId: source.productId, variationId: source.variationId, name: source.name,
                        supplierNames: product ? getSupplierNames(product) : 'Fábrica não informada',
                        assignedSupplier: source.assignedSupplier || 'Sem fornecedor', systemStock: source.systemStock,
                        physicalCount: source.physicalCount, unit: product?.unit || 'UN',
                        sku: source.sku || (product as any)?.sku || product?.code || '',
                        code: source.code || product?.code || '', barcode: source.barcode || (product as any)?.barcode || '',
                    } as AuditItem;
                });
                draftRef.current = { id: editingSession.id, code: editingSession.inventoryCode, markerMoveId: editingSession.markerMoveId, date: editingSession.date };
                scannedLabelsRef.current.clear();
                const config = { name: editingSession.inventoryCode, hasStages: editingSession.hasStages ?? false, responsibleId: editingSession.responsibleId || '' };
                scopeConfigRef.current = config;
                setScopeConfig(config);
                latestItemsRef.current = restoredItems;
                setItemsState(restoredItems);
                persistItems(restoredItems);
                setView('operation');
            } else {
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
        void restore().catch(error => {
            console.error('Falha ao restaurar inventário local:', error);
            toast.error('Não foi possível recuperar a contagem salva neste navegador.');
        });
        return () => { cancelled = true; };
    }, [isOpen, editingSession, allProducts, suppliers, copiedItems, getSupplierNames]);

    const handleConfirmScope = async (config: ScopeConfiguration) => {
        await ensureOfflineInventoryCatalogSynced();
        const initialItems = config.itemsSnapshot.map(snapshot => ({
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

        const nextScope = {
            name: config.name,
            hasStages: config.hasStages,
            scopeType: config.type,
            responsibleId: config.responsibleId,
        };
        const auditId = crypto.randomUUID();
        let code: string;
        try { code = await getNextInventoryCode(); }
        catch { code = `LOCAL-${auditId.slice(0, 8)}`; }
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
    };

    const saveDraft = useCallback(async (closeAfterSave = false) => {
        setIsSaving(true);
        try {
            await flushLocalWrites();
            if (closeAfterSave) onClose();
            return true;
        } catch (error: unknown) {
            console.error("Erro ao salvar rascunho da contagem:", error);
            toast.error("Não foi possível salvar o rascunho do inventário.");
            return false;
        } finally {
            setIsSaving(false);
        }
    }, [flushLocalWrites, onClose]);

    const incrementScannedItem = async (itemId: string, labelId?: string): Promise<number | null> => {
        if (labelId && scannedLabelsRef.current.has(labelId)) return null;
        const current = latestItemsRef.current.find(item => item.id === itemId);
        if (!current) throw new Error('Produto não encontrado no inventário local.');
        const count = (current.physicalCount ?? 0) + 1;
        if (labelId) scannedLabelsRef.current.add(labelId);
        setItems(previous => previous.map(item => item.id === itemId ? { ...item, physicalCount: count } : item));
        await flushLocalWrites();
        return count;
    };

    const handleFinalize = async (itemsWithAdjustment: Array<AuditItem & { reconciledExpected: number, difference: number }>) => {
        if (!scopeConfig) return;

        setIsSaving(true);
        try {
            await flushLocalWrites();
            const auditId = draftRef.current.id;
            const code = draftRef.current.code;
            if (!auditId || !code || !items.some(item => item.physicalCount !== null)) {
                throw new Error('Inventário sem identificação ou sem contagem.');
            }
            if (scopeConfig.hasStages && items.some(item => item.physicalCount === null)) {
                throw new Error('Todos os produtos devem ser contados antes de concluir o inventário por etapas.');
            }
            const responsible = employees.find((employee) => String(employee.id) === scopeConfig.responsibleId);
            const auditObservation = {
                inventoryAudit: true,
                inventoryCode: code,
                status: 'completed',
                name: scopeConfig.name,
                hasStages: scopeConfig.hasStages,
                responsibleId: scopeConfig.responsibleId,
                responsibleName: getEmployeeDisplayName(responsible) || editingSession?.responsibleName,
                items: items.map(({ productId, variationId, name, systemStock, physicalCount, assignedSupplier }) => ({ productId, variationId, name, systemStock, physicalCount, assignedSupplier })),
            };
            await finalizeWebInventory(auditId, code, auditObservation, itemsWithAdjustment);

            toast.success(`Inventário #${code} finalizado! ${items.length} produto(s) contados e ${itemsWithAdjustment.length} ajuste(s) lançados no estoque. ✨`);
            onClose();
        } catch (error: unknown) {
            console.error("Erro ao salvar inventário:", error);
            toast.error("Erro ao processar as movimentações de inventário.");
        } finally {
            setIsSaving(false);
        }
    };

    const hasChanges = items.some(i => i.physicalCount !== null);

    return {
        allProducts,
        suppliers,
        employees,
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
