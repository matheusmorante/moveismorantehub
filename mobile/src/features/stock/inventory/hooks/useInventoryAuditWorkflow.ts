import { useState, useCallback, useRef, useEffect } from 'react';
import { getNextInventoryCode } from '../../../../services/stockService';
import { Alert } from 'react-native';
import type { ScopeConfiguration } from './useInventoryScopeBuilder';
import type { InventorySession } from '../../types/stock.types';
import type { AuditItem, AuditDraftState, AuditWorkflowView, FinalizeAdjustmentItem } from '../types/inventoryWorkflow.types';
import { 
    restoreInventorySession, 
    duplicateInventorySession, 
    generateInventoryUUID, 
    createInventoryItemId 
} from '../services/inventorySessionInitializer';
import { useInventoryPersistenceQueue } from './useInventoryPersistenceQueue';
import { executeInventoryFinalization } from '../services/inventoryFinalizer';

export type { AuditItem } from '../types/inventoryWorkflow.types';

export const useInventoryAuditWorkflow = (
    userProfile: { id: string; full_name?: string; fullName?: string } | null,
    onClose: () => void,
    initialSession?: InventorySession | null,
    copiedItems?: any[] | null
) => {
    const [view, setView] = useState<AuditWorkflowView>('scope');
    const [items, setItemsState] = useState<AuditItem[]>([]);
    const [isSaving, setIsSaving] = useState(false);
    const [scopeConfig, setScopeConfig] = useState<{ name: string; hasStages: boolean; responsibleId: string; scopeType?: string } | null>(null);

    const draftRef = useRef<AuditDraftState>({});
    const latestItemsRef = useRef<AuditItem[]>(items);

    // Fila serializada para concorrência segura no SQLite
    const { persistToSQLite, flush } = useInventoryPersistenceQueue(draftRef, scopeConfig, userProfile?.id);

    const setItems: React.Dispatch<React.SetStateAction<AuditItem[]>> = useCallback(nextValue => {
        const next = typeof nextValue === 'function' ? nextValue(latestItemsRef.current) : nextValue;
        latestItemsRef.current = next;
        setItemsState(next);
        void persistToSQLite(next).catch(error => {
            console.error('[Inventory] Falha ao salvar edição local:', error);
            Alert.alert('Falha ao salvar', 'A contagem não foi gravada no aparelho. Verifique o armazenamento antes de sair.');
        });
    }, [persistToSQLite]);

    // Inicialização ao continuar inventário existente ou duplicar
    useEffect(() => {
        let isMounted = true;

        const initializeFlow = async () => {
            if (initialSession) {
                setIsSaving(true);
                try {
                    const data = await restoreInventorySession(initialSession, userProfile?.id);
                    if (data && isMounted) {
                        draftRef.current = data.draft;
                        latestItemsRef.current = data.items;
                        setItemsState(data.items);
                        setScopeConfig(data.scopeConfig);
                        setView('operation');
                    }
                } catch (error) {
                    console.error('[Workflow] Erro ao restaurar inventário:', error);
                    Alert.alert('Erro', 'Não foi possível carregar os dados do inventário.');
                } finally {
                    if (isMounted) setIsSaving(false);
                }
            } else if (copiedItems && copiedItems.length > 0) {
                setIsSaving(true);
                try {
                    const data = await duplicateInventorySession(copiedItems, userProfile?.id);
                    if (isMounted) {
                        draftRef.current = data.draft;
                        latestItemsRef.current = data.items;
                        setItemsState(data.items);
                        setScopeConfig(data.scopeConfig);
                        await persistToSQLite(data.items, data.scopeConfig);
                        setView('operation');
                    }
                } catch (error) {
                    console.error('[Workflow] Erro ao duplicar inventário:', error);
                } finally {
                    if (isMounted) setIsSaving(false);
                }
            }
        };

        void initializeFlow();
        return () => { isMounted = false; };
    }, [initialSession, copiedItems, userProfile?.id]);

    const handleConfirmScope = async (config: ScopeConfiguration) => {
        const initialItems: AuditItem[] = config.itemsSnapshot.map(snapshot => ({
            id: createInventoryItemId(),
            key: `${snapshot.productId}-${snapshot.variationId || 'main'}`,
            productId: snapshot.productId,
            variationId: snapshot.variationId,
            name: snapshot.name,
            supplierNames: snapshot.supplierNames,
            assignedSupplier: snapshot.assignedSupplier || 'Sem fornecedor',
            systemStock: snapshot.systemStock,
            physicalCount: null,
            unit: snapshot.unit,
            sku: snapshot.sku,
            code: snapshot.code,
            barcode: snapshot.barcode,
            isActive: snapshot.isActive,
        }));

        const nextScope = {
            name: config.name,
            hasStages: config.hasStages ?? false,
            responsibleId: config.responsibleId,
            scopeType: config.type,
        };

        setScopeConfig(nextScope);

        const auditId = draftRef.current.id || generateInventoryUUID();
        draftRef.current.id = auditId;
        try { draftRef.current.code = await getNextInventoryCode(); }
        catch { draftRef.current.code = `LOCAL-${auditId.slice(0, 8)}`; }
        if (!draftRef.current.code) draftRef.current.code = `LOCAL-${auditId.slice(0, 8)}`;
        draftRef.current.date = new Date().toISOString();
        latestItemsRef.current = initialItems;
        setItemsState(initialItems);
        try {
            await persistToSQLite(initialItems, nextScope);
            setView('operation');
        } catch (error) {
            console.error('[Inventory] Falha ao iniciar inventário local:', error);
            Alert.alert('Falha ao salvar', 'Não foi possível iniciar o inventário no armazenamento do aparelho.');
        }
    };

    const handleUpdateCount = useCallback((itemId: string, newCount: number | null) => {
        setItems(prevItems => prevItems.map(item => item.id === itemId ? { ...item, physicalCount: newCount } : item));
    }, [setItems]);

    const incrementScannedItem = async (itemId: string, labelId?: string): Promise<number | null> => {
        const item = latestItemsRef.current.find(candidate => candidate.id === itemId);
        if (!item) throw new Error('Produto não encontrado no rascunho local.');
        if (labelId && latestItemsRef.current.some(candidate => candidate.countedLabelIds?.includes(labelId))) return null;
        const count = (item.physicalCount ?? 0) + 1;
        const next = latestItemsRef.current.map(candidate => candidate.id === itemId
            ? { ...candidate, physicalCount: count, countedLabelIds: labelId ? [...(candidate.countedLabelIds || []), labelId] : candidate.countedLabelIds }
            : candidate);
        latestItemsRef.current = next;
        setItemsState(next);
        await persistToSQLite(next);
        return count;
    };

    const handleFinalize = async (itemsWithAdjustment: FinalizeAdjustmentItem[]) => {
        if (!scopeConfig) {
            Alert.alert('Atenção', 'Configuração de escopo inválida.', [{ text: 'OK', onPress: onClose }]);
            return;
        }

        setIsSaving(true);
        try {
            await flush();
            await executeInventoryFinalization({
                items: latestItemsRef.current,
                itemsWithAdjustment,
                scopeConfig,
                draftRef,
                userProfile,
                onClose,
            });
        } catch (error) {
            console.error('[Inventory] Falha ao preparar conclusão:', error);
            Alert.alert('Falha ao salvar', 'A contagem local ainda não foi gravada. Tente novamente.');
        } finally {
            setIsSaving(false);
        }
    };

    return {
        view,
        setView,
        items,
        setItems,
        scopeConfig,
        draftRef,
        isSaving,
        handleConfirmScope,
        handleUpdateCount,
        incrementScannedItem,
        flushLocalWrites: flush,
        handleFinalize,
    };
};
