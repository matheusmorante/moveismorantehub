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
    const [items, setItems] = useState<AuditItem[]>([]);
    const [isSaving, setIsSaving] = useState(false);
    const [scopeConfig, setScopeConfig] = useState<{ name: string; hasStages: boolean; responsibleId: string; scopeType?: string } | null>(null);

    const draftRef = useRef<AuditDraftState>({});
    const latestItemsRef = useRef<AuditItem[]>(items);
    latestItemsRef.current = items;

    // Fila serializada para concorrência segura no SQLite
    const { persistToSQLite } = useInventoryPersistenceQueue(draftRef, scopeConfig, userProfile?.id);

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
                        setItems(data.items);
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
                        setItems(data.items);
                        setScopeConfig(data.scopeConfig);
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
        }));

        setItems(initialItems);
        setScopeConfig({
            name: config.name,
            hasStages: config.hasStages ?? false,
            responsibleId: config.responsibleId,
            scopeType: config.type,
        });

        draftRef.current.id = draftRef.current.id || generateInventoryUUID();
        draftRef.current.code = await getNextInventoryCode();
        draftRef.current.date = new Date().toISOString();

        setView('operation');
    };

    const handleUpdateCount = useCallback((itemId: string, newCount: number | null) => {
        setItems(prevItems => {
            const next = prevItems.map(item => item.id === itemId ? { ...item, physicalCount: newCount } : item);
            latestItemsRef.current = next;
            persistToSQLite(next);
            return next;
        });
    }, [persistToSQLite]);

    const handleFinalize = async (itemsWithAdjustment: FinalizeAdjustmentItem[]) => {
        if (!scopeConfig) {
            Alert.alert('Atenção', 'Configuração de escopo inválida.', [{ text: 'OK', onPress: onClose }]);
            return;
        }

        setIsSaving(true);
        try {
            await executeInventoryFinalization({
                items,
                itemsWithAdjustment,
                scopeConfig,
                draftRef,
                userProfile,
                onClose,
            });
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
        handleFinalize,
    };
};
