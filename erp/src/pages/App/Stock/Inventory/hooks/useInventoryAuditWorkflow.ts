import { useState, useEffect, useRef, useCallback } from "react";
import { getNextInventoryCode, saveInventoryMove, updateInventoryMove } from '@/pages/utils/inventoryService';
import { toast } from "react-toastify";
import type InventoryMove from "@/pages/types/inventoryMove.type";
import type { InventorySnapshotItem, InventoryAuditSession } from "../types/inventoryAudit.types";
import type { ScopeConfiguration } from "../modals/InventoryScopeModal";
import type { AuditItem } from "../modals/InventoryAuditModal";
import { getEmployeeDisplayName } from "../components/InventoryResponsibleSelect";
import { useInventoryAuditData } from "./useInventoryAuditData";

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
    const [items, setItems] = useState<AuditItem[]>([]);
    const [isSaving, setIsSaving] = useState(false);
    const [scopeConfig, setScopeConfig] = useState<{ name: string, responsibleId: string, hasStages?: boolean, scopeType?: string } | null>(null);
    
    const draftRef = useRef<{ id?: string; code?: string; markerMoveId?: string; date?: string }>({});
    const lastSavedSignatureRef = useRef<string | null>(null);
    const lastAttemptedSignatureRef = useRef<string | null>(null);

    const createItemId = () => crypto.randomUUID();

    // Initialization
    useEffect(() => {
        if (!isOpen) return;
        
        if (editingSession && allProducts.length > 0 && suppliers.length > 0) {
            // Restore from editing session
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
                } as AuditItem;
            });

            setItems(restoredItems);
            setScopeConfig({
                name: editingSession.inventoryCode,
                hasStages: editingSession.hasStages ?? false,
                responsibleId: editingSession.responsibleId || "",
            });
            draftRef.current = {
                id: editingSession.id,
                code: editingSession.inventoryCode,
                markerMoveId: editingSession.markerMoveId,
                date: editingSession.date,
            };
            setView('operation');
        } else if (copiedItems) {
            // Future implementation
            setView('scope');
        } else {
            // Brand new
            setItems([]);
            setScopeConfig(null);
            draftRef.current = {};
            lastSavedSignatureRef.current = null;
            setView('scope');
        }
    }, [isOpen, editingSession, allProducts, suppliers, copiedItems, getSupplierNames]);

    const handleConfirmScope = async (config: ScopeConfiguration) => {
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
        }));

        setItems(initialItems);
        setScopeConfig({
            name: config.name,
            hasStages: config.hasStages,
            scopeType: config.type,
            responsibleId: config.responsibleId,
        });

        
        const code = await getNextInventoryCode();
        draftRef.current.code = code;
        draftRef.current.date = new Date().toISOString();
        
        setView('operation');
    };

    // Auto Save Draft
    const saveDraft = useCallback(async (closeAfterSave = false) => {
        const draft = draftRef.current;
        if (!items.length && !draft.markerMoveId) {
            if (closeAfterSave) onClose();
            return true;
        }

        setIsSaving(true);
        try {
            const auditId = draft.id || crypto.randomUUID();
            const code = draft.code || await getNextInventoryCode();
            const auditDate = draft.date || new Date().toISOString();
            const responsible = employees.find((employee) => String(employee.id) === scopeConfig?.responsibleId);
            
            const auditObservation = JSON.stringify({
                inventoryAudit: true,
                inventoryCode: code,
                status: 'in_progress',
                hasStages: scopeConfig?.hasStages,
                name: scopeConfig?.name,
                responsibleId: scopeConfig?.responsibleId,
                responsibleName: getEmployeeDisplayName(responsible) || editingSession?.responsibleName,
                items: items.map(({ productId, variationId, name, systemStock, physicalCount, assignedSupplier }) => ({ productId, variationId, name, systemStock, physicalCount, assignedSupplier })),
            });

            if (draft.markerMoveId) {
                await updateInventoryMove(draft.markerMoveId, { date: auditDate, observation: auditObservation, label: `Inventário #${code}` });
            } else {
                const auditMarker = items[0] || { productId: 'unknown', variationId: undefined, systemStock: 0 };
                const savedMarker = await saveInventoryMove({
                    productId: auditMarker.productId,
                    variationId: auditMarker.variationId,
                    productDescription: 'Sessão de inventário',
                    type: 'adjustment',
                    quantity: 0,
                    date: auditDate,
                    label: `Inventário #${code}`,
                    observation: auditObservation,
                    relatedEntityId: auditId,
                }, auditMarker.systemStock);
                draft.markerMoveId = savedMarker?.id;
                draft.date = auditDate;
            }
            draft.id = auditId;
            draft.code = code;
            lastSavedSignatureRef.current = JSON.stringify({ scopeConfig, items });
            if (closeAfterSave) onClose();
            return true;
        } catch (error: unknown) {
            console.error("Erro ao salvar rascunho da contagem:", error);
            toast.error("Não foi possível salvar o rascunho do inventário.");
            return false;
        } finally {
            setIsSaving(false);
        }
    }, [items, scopeConfig, employees, editingSession, onClose]);

    useEffect(() => {
        const signature = JSON.stringify({ scopeConfig, items });
        if (!isOpen || isSaving || !items.length || signature === lastSavedSignatureRef.current || view === 'scope') return;
        
        // Impede que continue tentando salvar a mesma versão a cada 1.5s se já falhou
        if (signature === lastAttemptedSignatureRef.current) return;
        lastAttemptedSignatureRef.current = signature;

        // const timeoutId = window.setTimeout(() => { void saveDraft(); }, 1500);
        // return () => window.clearTimeout(timeoutId);
    }, [isOpen, isSaving, items, scopeConfig, view, saveDraft]);

    const handleFinalize = async (itemsWithAdjustment: Array<AuditItem & { reconciledExpected: number, difference: number }>) => {
        if (!scopeConfig) return;

        setIsSaving(true);
        try {
            const auditId = draftRef.current.id || crypto.randomUUID();
            const code = draftRef.current.code || await getNextInventoryCode();
            const completionDate = new Date().toISOString();
            const responsible = employees.find((employee) => String(employee.id) === scopeConfig.responsibleId);
            
            // Marker move now completed
            const auditObservation = JSON.stringify({
                inventoryAudit: true,
                inventoryCode: code,
                status: 'completed',
                name: scopeConfig.name,
                hasStages: scopeConfig.hasStages,
                responsibleId: scopeConfig.responsibleId,
                responsibleName: getEmployeeDisplayName(responsible) || editingSession?.responsibleName,
                items: items.map(({ productId, variationId, name, systemStock, physicalCount, assignedSupplier }) => ({ productId, variationId, name, systemStock, physicalCount, assignedSupplier })),
            });

            if (draftRef.current.markerMoveId) {
                await updateInventoryMove(draftRef.current.markerMoveId, {
                    observation: auditObservation,
                    label: `Inventário #${code} (Concluído)`
                });
            }

            // Create adjustments
            for (const item of itemsWithAdjustment) {
                const move: InventoryMove = {
                    productId: item.productId,
                    variationId: item.variationId,
                    productDescription: item.name,
                    type: 'adjustment',
                    quantity: 0,
                    date: completionDate,
                    label: `Ajuste lançado pelo inventário #${code}`,
                    observation: JSON.stringify({ 
                        note: `Saldo definido pelo inventário #${code}`, 
                        targetStock: item.physicalCount, 
                        source: 'inventory_audit' 
                    }),
                    relatedEntityId: auditId,
                };

                await saveInventoryMove(move, item.reconciledExpected);
            }

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
    };
};
